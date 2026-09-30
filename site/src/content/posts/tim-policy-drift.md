---
title: "训推不一致 & 策略更新漂移"
date: "2026-08-24"
tags: ["训推不一致", "策略更新漂移", "PPO"]
category: "强化学习"
excerpt: "rollout 数据与当前策略之间存在训推不一致与策略更新漂移两类差异。三策略 PPO 将二者解耦，并据此厘清 PPO clip、TIS、IcePop、GSPO 与 R3 的作用边界。"
---

现代 LLM 强化学习系统通常不会用同一套执行栈完成 rollout 与训练：

```text
推理引擎：vLLM / SGLang / LMDeploy
    负责逐 token 生成 rollout

训练引擎：FSDP / Megatron / DeepSpeed
    负责重算 log probability、反向传播和参数更新
```

即使两侧加载完全相同的权重，也可能因为数值精度、算子实现、并行方式和 MoE 路由不同，对同一个 token 给出不同概率。这种现象称为 **Training-Inference Mismatch（TIM，训练—推理不一致）**。

与此同时，PPO 会在同一批 rollout 上执行多个 mini-batch 与 epoch 的更新，使当前策略逐渐偏离冻结的旧策略，这称为**策略更新漂移（policy update drift）**。

| 类型 | log probability 差 | 主要来源 | 对应处理方法 |
|---|---|---|---|
| 训推不一致（TIM） | $\log\pi_{\text{train},\text{old}}-\log\pi_{\text{rollout},\text{old}}$ | 精度、内核、并行归约、MoE 路由 | 训推对齐、TIS / IcePop、R3 |
| 策略更新漂移 | $\log\pi_{\text{train},\theta}-\log\pi_{\text{train},\text{old}}$ | mini-batch 切分、多轮 epoch | PPO ratio 与 clip |

本文首先区分 PPO 中 $\pi_{\text{old}}$ 隐含承担的 behavior 与 proximal 两种角色，使两类差异各自对应一个 ratio；在此基础上，分析 PPO clip、TIS、IcePop、GSPO 与 R3 分别作用于哪一类差异。

---

# 一、基本信息

设 token $a_t$ 的上下文状态为 $s_t$。标准 PPO-Clip 以 $r_t(\theta)=\pi_\theta(a_t|s_t)/\pi_{\text{old}}(a_t|s_t)$ 配合 clip 约束更新幅度，其中 $\pi_{\text{old}}$ 隐含地承担了两个角色：既是产生训练数据的 **behavior policy**，也是 clip 的冻结锚点 **proximal policy**。

经典同步 PPO 中两者为同一策略，单一 ratio 即可；但在 rollout 与训练分离的双引擎系统中，数据由 rollout 引擎采样，old logprob 却由训练引擎重算，两者在数值上不再相同，继续统一记为 $\pi_{\text{old}}$ 会掩盖问题来源。

将两个角色区分开后，系统中存在三个策略：

| 策略 | 角色 | 作用 |
|---|---|---|
| $\pi_{\text{rollout},\text{old}}$ | Behavior policy | rollout 引擎实际用于采样 |
| $\pi_{\text{train},\text{old}}$ | Proximal policy | 训练引擎中的冻结旧策略，也是 PPO clip 锚点 |
| $\pi_{\text{train},\theta}$ | Current policy | 正在反向传播和更新的训练策略 |

当 rollout 与训练加载同一组旧权重时，相邻两个策略之间的差异正好对应本文关注的两类差异：

- behavior 与 proximal 之间是**训推不一致**；
- proximal 与 current 之间是**策略更新漂移**。

若 rollout 使用的参数版本落后于训练侧（如异步 rollout、partial rollout 或 replay buffer），behavior 与 proximal 之间还会混入参数版本滞后（policy lag）；除特别说明外，下文默认同步训练。

---

# 二、两类差异

## 1. 训推不一致

behavior 与 proximal 之间的差异用 $\rho_t$ 刻画：

$$
\rho_t
:=
\frac{
\pi_{\text{train},\text{old}}(a_t|s_t)
}{
\pi_{\text{rollout},\text{old}}(a_t|s_t)
}
$$

$\rho_t$ 本质上是重要性采样（importance sampling）的权重：样本服从 $\pi_{\text{rollout},\text{old}}$，而优化目标定义在 $\pi_{\text{train},\text{old}}$ 下，按 $\rho_t$ 对样本加权即可在两种分布之间换算期望：

$$
\mathbb{E}_{a\sim\pi_{\text{rollout},\text{old}}}
\left[
\frac{
\pi_{\text{train},\text{old}}(a)
}{
\pi_{\text{rollout},\text{old}}(a)
}
f(a)
\right]
=
\mathbb{E}_{a\sim\pi_{\text{train},\text{old}}}[f(a)]
$$

取对数即得 TIM 对应的 log probability 差：

$$
\Delta_t^{\text{engine}}
:=
\log \pi_{\text{train},\text{old}}(a_t|s_t)
-
\log\pi_{\text{rollout},\text{old}}(a_t|s_t)
=
\log\rho_t
$$

即使两侧共享完全相同的 checkpoint 差异依然存在。常见来源包括：

- BF16、FP16、FP8 或 INT8 的精度与量化差异；
- MoE router 的 Top-$K$ 专家选择不同；
- 推理引擎逐 token decode，而训练引擎一次并行处理整段序列。

这一偏差并非源于参数更新幅度过大，而是源于：

> 数据由 $\pi_{\text{rollout},\text{old}}$ 采样得到，但 loss 的 clip 锚点是 $\pi_{\text{train},\text{old}}$。

## 2. 策略更新漂移

proximal 与 current 之间的差异即 PPO 中的更新 ratio：

$$
r_t(\theta)
:=
\frac{
\pi_{\text{train},\theta}(a_t|s_t)
}{
\pi_{\text{train},\text{old}}(a_t|s_t)
}
$$

每轮 PPO 更新开始时：

$$
\pi_{\text{train},\theta}
=
\pi_{\text{train},\text{old}}
\quad\Longrightarrow\quad
r_t(\theta)=1
$$

随着 optimizer 执行更新，$\pi_{\text{train},\theta}$ 逐渐偏离冻结的 $\pi_{\text{train},\text{old}}$：

$$
\Delta_t^{\text{update}}
:=
\log \pi_{\text{train},\theta}(a_t|s_t)
-
\log \pi_{\text{train},\text{old}}(a_t|s_t)
=
\log r_t(\theta)
$$

其常见来源包括：

- 同一批 rollout 被切成多个 mini-batch；
- 一批数据被训练多个 PPO epoch；
- 当前 learner 相对冻结 old policy 已经前进若干步。

因此，PPO clip 回答的问题是：

> 在训练引擎定义的概率空间中，当前策略相对 proximal policy 偏离了多少？

## 3. 总 ratio 分解

两个 ratio 分别连接 behavior、proximal 与 current 三个角色：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:820px;min-width:720px" viewBox="0 0 820 252" role="img">
<title>三个策略与两个 ratio</title>
<desc>rollout-old 行为策略经采样分布校正 rho t 连接到 train-old 近端策略，再经 PPO 更新比 r t 与裁剪连接到 train-current 当前策略；端到端总概率比等于 rho t 乘以 r t。</desc>
<defs>
<marker id="tim-three-policy-correction-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="tim-three-policy-update-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#0F6E56" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="tim-three-policy-total-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#A32D2D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="410" y="22" font-size="16" font-weight="600" text-anchor="middle" fill="currentColor">behavior → proximal → current</text>
<rect x="40" y="72" width="180" height="76" rx="10" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.75"/>
<text x="130" y="99" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">rollout-old</text>
<text x="130" y="124" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#633806">behavior · 实际采样</text>
<path d="M220 110 H316" fill="none" stroke="#BA7517" stroke-width="1.75" marker-end="url(#tim-three-policy-correction-arrow)"/>
<text x="268" y="52" font-size="15" font-weight="600" text-anchor="middle" fill="#BA7517">ρₜ</text>
<text x="268" y="68" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.7">采样分布校正</text>
<rect x="320" y="72" width="180" height="76" rx="10" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.75"/>
<text x="410" y="99" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">train-old</text>
<text x="410" y="124" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#085041">proximal · 冻结锚点</text>
<path d="M500 110 H596" fill="none" stroke="#0F6E56" stroke-width="1.75" marker-end="url(#tim-three-policy-update-arrow)"/>
<text x="548" y="52" font-size="15" font-weight="600" text-anchor="middle" fill="#0F6E56">rₜ</text>
<text x="548" y="68" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.7">PPO 更新 / clip</text>
<rect x="600" y="72" width="180" height="76" rx="10" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.75"/>
<text x="690" y="99" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#501313">train-current</text>
<text x="690" y="124" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#791F1F">current · 正在更新</text>
<path d="M130 150 V166 H690 V150" fill="none" stroke="#A32D2D" stroke-width="1.25" stroke-dasharray="4 3"/>
<path d="M410 166 V184" fill="none" stroke="#A32D2D" stroke-width="1.5" marker-end="url(#tim-three-policy-total-arrow)"/>
<rect x="230" y="188" width="360" height="48" rx="9" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.75"/>
<text x="410" y="207" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#501313">总 ratio = ρₜ × rₜ</text>
<text x="410" y="226" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#791F1F">current / behavior · 两段 ratio 的乘积</text>
</svg>
</div>

端到端的总 ratio 恰好是两者的乘积：

$$
\frac{
\pi_{\text{train},\theta}(a_t|s_t)
}{
\pi_{\text{rollout},\text{old}}(a_t|s_t)
}
=
\underbrace{
\frac{\pi_{\text{train},\text{old}}(a_t|s_t)}{\pi_{\text{rollout},\text{old}}(a_t|s_t)}
}_{\rho_t:\ \text{采样分布校正}}
\cdot
\underbrace{
\frac{\pi_{\text{train},\theta}(a_t|s_t)}{\pi_{\text{train},\text{old}}(a_t|s_t)}
}_{r_t(\theta):\ \text{策略更新幅度}}
$$

---

# 三、Decoupled 三策略 PPO

以下述数值为例，假设某个已采样 token 的概率为：

$$
\pi_{\text{rollout},\text{old}}(a_t|s_t)=0.01,
\qquad
\pi_{\text{train},\text{old}}(a_t|s_t)=0.02,
\qquad
\pi_{\text{train},\theta}(a_t|s_t)=0.021
$$

则三个 ratio 分别为：

| ratio | 数值 | 含义 |
|---|---:|---|
| $\rho_t=\pi_{\text{train},\text{old}}/\pi_{\text{rollout},\text{old}}$ | $2$ | behavior → proximal 的采样分布差异 |
| $r_t=\pi_{\text{train},\theta}/\pi_{\text{train},\text{old}}$ | $1.05$ | proximal → current 的参数更新幅度 |
| $\pi_{\text{train},\theta}/\pi_{\text{rollout},\text{old}}=\rho_t r_t$ | $2.1$ | 两段差异叠加后的总 ratio |

若只考察 $r_t=1.05$，会忽略数据实际来自 rollout policy 这一事实；若将总 ratio $2.1$ 直接视为 PPO 更新幅度，又会把 TIM 误判为参数更新。合理的做法是让 $\rho_t=2$ 负责分布校正，clip 只约束实际发生的 $5\%$ 参数变化，下面的目标函数正是这样构造的。

定义 PPO 的 clipped surrogate（$\hat A_t$ 为优势估计，$\epsilon$ 为 clip 范围）：

$$
g(r_t,\hat A_t)
:=
\min\left(
r_t\hat A_t,\,
\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)\hat A_t
\right)
$$

如果希望 clip 始终相对 $\pi_{\text{train},\text{old}}$ 生效，但数据实际来自 $\pi_{\text{rollout},\text{old}}$，则将 $\rho_t$ 作为外层权重乘在 surrogate 上：

$$
\boxed{
J_{\text{3P}}(\theta)
=
\mathbb{E}_{(s_t,a_t)\sim\pi_{\text{rollout},\text{old}}}
\left[
\rho_t\,
g(r_t(\theta),\hat A_t)
\right]
}
$$

两部分职责明确分离：

- $\rho_t$：把 behavior distribution 校正到 proximal distribution；
- $r_t+\operatorname{clip}$：限制 current policy 相对 proximal policy 的更新幅度。

当 behavior 与 proximal 完全一致时，$\rho_t\equiv 1$，目标自动退化为标准 PPO。这也是三策略形式的重要性质之一：**行为分布校正可以在一致时自然消失，而 PPO clip 的语义保持不变。**

实现层面还需满足两点要求：

- **$\rho_t$ 视为常数。** $\pi_{\text{train},\text{old}}$ 与 $\pi_{\text{rollout},\text{old}}$ 在本轮更新中都是冻结的，$\nabla_\theta\rho_t=0$。实现时缓存 rollout logprob、用冻结 old policy 计算 training logprob，避免梯度回传到 old logprob 或校正权重。
- **支持集必须覆盖。** 换测度要求 $\pi_{\text{train},\text{old}}\ll\pi_{\text{rollout},\text{old}}$，即目标分布可能生成的回复，在 behavior policy 下的概率必须非零。top-$k$、top-$p$、约束解码和 token ban 都可能制造零概率区域，因此 temperature 与采样过滤后的归一化概率才是实际的 $\pi_{\text{rollout},\text{old}}$，不能用未过滤的原始模型概率代替。

> $J_{\text{3P}}$ 对每个 token 单独乘以 $\rho_t$，属于 token 级近似。回复 $y=(y_1,\dots,y_T)$ 是自回归生成的，严格的换测度应使用整条序列的 ratio $\rho_{\text{seq}}(y|x)=\prod_{t=1}^{T}\rho_t$，但连乘会迅速放大方差：即使每个 token 的 ratio 只有 $1.01$，$1.01^{1000}\approx 2.1\times10^4$，长 CoT 和多轮 Agent 轨迹因此极易出现 heavy-tail 权重。token 级校正方差低，也便于与 PPO / GRPO 的 token loss 结合，代价是没有修正前缀分布的差异，属于有偏近似；序列越长、策略差异越大，偏差越明显。

---

# 四、TIS、IcePop、GSPO 与 R3

以 $J_{\text{3P}}$ 作为参照：外层 $\rho_t$ 校正训推不一致，内层 $r_t$ 与 clip 约束策略更新漂移。下面的方法可以按改动位置来理解：

> **TIS 与 IcePop 修改外层 $\rho_t$，GSPO 修改内层 ratio 的粒度，R3 则从源头让 $\rho_t$ 接近 1。**

## 1. TIS：截断重要性权重

完整 importance ratio 的方差可能极大，TIS（Truncated Importance Sampling）因此对 $\rho_t$ 做上截断：

$$
\bar\rho_t
:=
\min(\rho_t,C)
$$

再将 $\bar\rho_t$ 乘在 PPO / GRPO surrogate 外部：

$$
J_C(\theta)
=
\mathbb{E}_{(s_t,a_t)\sim\pi_{\text{rollout},\text{old}}}
\left[
\bar\rho_t\,
g(r_t(\theta),\hat A_t)
\right]
$$

超过阈值的样本仍保留，但权重封顶为 $C$，以引入偏差为代价换取更低的方差。

## 2. IcePop 与 MIS：双边区间与硬 mask

IcePop 同样作用于 $\rho_t$，但不做封顶，而是直接丢弃落在双边区间之外的 token：

$$
\mathcal{M}(\rho_t;\alpha,\beta)
:=
\begin{cases}
\rho_t, & \alpha\le \rho_t\le\beta \\
0, & \text{otherwise}
\end{cases}
$$

因此 ratio 过大或过小的 token 都不参与梯度，比 TIS 更保守。

这类对越界样本直接 mask 的做法统称 MIS（Masked Importance Sampling），可作用于单个 token，也可作用于整条 sequence；IcePop 可视为 token 级 MIS。Ring-1T 报告中的默认区间为 $[0.5,5]$。

## 3. GSPO：序列级更新 ratio

GSPO 定义长度归一化的 sequence ratio（论文沿用单一的 $\pi_{\text{old}}$ 记号）：

$$
s_i(\theta)
:=
\left(
\frac{
\pi_\theta(y_i|x)
}{
\pi_{\text{old}}(y_i|x)
}
\right)^{1/|y_i|}
=
\exp\left[
\frac{1}{|y_i|}
\sum_{t=1}^{|y_i|}
\log
\frac{
\pi_\theta(y_{i,t}|x,y_{i,<t})
}{
\pi_{\text{old}}(y_{i,t}|x,y_{i,<t})
}
\right]
$$

$s_i$ 是逐 token 更新 ratio 的几何平均。PPO / GRPO 对每个 token 分别计算 $r_t$ 并逐 token clip，GSPO 则让整条回复共享同一个 $s_i$ 进行 clipping 和加权，使优化单元与序列级 reward 对齐。**它改变的是 old → current 更新 ratio 的粒度，而不是显式引入 $\pi_{\text{train},\text{old}}/\pi_{\text{rollout},\text{old}}$ 作为校正项。**

GSPO 对单 token 概率尖峰和 MoE 路由波动更不敏感，论文也报告它允许在一些场景直接使用推理引擎返回的 sequence likelihood。但**“更容忍 TIM”不等于“显式消除了 TIM”**：如果 $s_i$ 的分子与分母来自不同执行栈，它会同时混入 TIM 与策略更新漂移。

## 4. R3：MoE 路由的源头对齐

MoE router 通过 $\mathbf{I}=\operatorname{TopKMask}(\mathbf{s},K)$ 离散地选择专家：router logits 上的微小数值差异一旦改变 Top-$K$ 边界处的排序，就会变成专家选择分歧，并沿后续多层计算放大：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:900px;min-width:800px" viewBox="0 0 900 202" role="img">
<title>MoE 路由误差放大为 token 概率比长尾</title>
<desc>router logits 的微小差异使 Top-K 边界候选交换顺序，导致训练与推理选择不同专家，随后 hidden state 差异被放大，最终形成 token probability ratio 长尾。</desc>
<defs>
<marker id="tim-moe-tail-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#A32D2D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="450" y="23" font-size="16" font-weight="600" text-anchor="middle" fill="currentColor">连续微差经过离散路由边界后被结构性放大</text>
<rect x="20" y="62" width="140" height="76" rx="10" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.75"/>
<text x="90" y="89" font-size="14" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">router logits</text>
<text x="90" y="114" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">出现微小差异</text>
<path d="M160 100 H196" fill="none" stroke="#A32D2D" stroke-width="1.5" marker-end="url(#tim-moe-tail-arrow)"/>
<rect x="200" y="62" width="140" height="76" rx="10" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.75"/>
<text x="270" y="89" font-size="14" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">Top-K 边界</text>
<text x="270" y="114" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">候选次序交换</text>
<path d="M340 100 H376" fill="none" stroke="#A32D2D" stroke-width="1.5" marker-end="url(#tim-moe-tail-arrow)"/>
<rect x="380" y="62" width="140" height="76" rx="10" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.75"/>
<text x="450" y="89" font-size="14" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#501313">选择不同专家</text>
<text x="450" y="114" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#791F1F">训练 ≠ 推理</text>
<path d="M520 100 H556" fill="none" stroke="#A32D2D" stroke-width="1.5" marker-end="url(#tim-moe-tail-arrow)"/>
<rect x="560" y="62" width="140" height="76" rx="10" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.75"/>
<text x="630" y="89" font-size="14" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#501313">hidden state</text>
<text x="630" y="114" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#791F1F">差异继续放大</text>
<path d="M700 100 H736" fill="none" stroke="#A32D2D" stroke-width="1.5" marker-end="url(#tim-moe-tail-arrow)"/>
<rect x="740" y="62" width="140" height="76" rx="10" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.75"/>
<text x="810" y="89" font-size="14" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#501313">token ratio</text>
<text x="810" y="114" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#791F1F">形成长尾</text>
<path d="M90 155 H270" fill="none" stroke="#BA7517" stroke-width="2" stroke-linecap="round"/>
<path d="M270 155 H810" fill="none" stroke="#A32D2D" stroke-width="2" stroke-linecap="round"/>
<text x="90" y="179" font-size="12.5" text-anchor="middle" fill="#BA7517">连续数值扰动</text>
<text x="540" y="179" font-size="12.5" text-anchor="middle" fill="#A32D2D">离散切换 → 结构性 heavy tail</text>
</svg>
</div>

R3（Rollout Routing Replay）在 rollout 时记录推理引擎的专家选择 mask $\mathbf{I}_{\text{infer}}$，训练前向时不再重新决定 Top-$K$ 专家，而是复用该 mask：

$$
g_{\text{replay},i}
=
\frac{
I_{\text{infer},i}\exp(s_{\text{train},i})
}{
\sum_j I_{\text{infer},j}\exp(s_{\text{train},j})
}
$$

这样既固定了训练与推理选中的专家集合，又保留了训练 logits 上的 softmax 与梯度路径。R3 的实验显示，固定 expert selection 后，MoE 的训推 KL 与极端 token 比例明显下降，说明路由分歧不是普通的独立数值噪声，而是具有放大效应的结构性误差。

## 5. 方法对照

| 方法 | 主要 ratio 或对象 | 处理的核心问题 | 代价或限制 |
|---|---|---|---|
| PPO / GRPO clip | $\pi_{\text{train},\theta}/\pi_{\text{train},\text{old}}$ | 约束参数更新幅度 | 不自动修正 rollout 与 train-old 的差异 |
| Decoupled PPO | 外层 $\pi_{\text{train},\text{old}}/\pi_{\text{rollout},\text{old}}$，内层 $\pi_{\text{train},\theta}/\pi_{\text{train},\text{old}}$ | 分离采样校正与更新约束 | 需要额外 old / rollout logprob |
| TIS | 截断 $\pi_{\text{train},\text{old}}/\pi_{\text{rollout},\text{old}}$ | 降低 IS 权重的方差 | 引入截断偏差 |
| MIS / IcePop | mask 后的 $\pi_{\text{train},\text{old}}/\pi_{\text{rollout},\text{old}}$ | 丢弃极端不一致 token / sequence | 降低样本利用率，阈值敏感 |
| GSPO | sequence-level $\pi_\theta/\pi_{\text{old}}$ | 稳定序列级更新与 clipping | 更容忍 TIM，但没有显式分离 TIM |
| R3 | inference routing mask | 消除 MoE 专家选择分歧 | 需要传输和缓存路由信息，仅处理路由误差 |

---

# 五、总结

LLM RL 中的 ratio 不应笼统地写成“new / old”。把 $\pi_{\text{old}}$ 拆成 $\pi_{\text{rollout},\text{old}}$、$\pi_{\text{train},\text{old}}$ 与 $\pi_{\text{train},\theta}$ 三个角色后，decoupled PPO 目标可以写成：

$$
\boxed{
J_{\text{3P}}(\theta)
=
\mathbb{E}_{(s_t,a_t)\sim\pi_{\text{rollout},\text{old}}}
\Big[
\underbrace{
\frac{\pi_{\text{train},\text{old}}(a_t|s_t)}{\pi_{\text{rollout},\text{old}}(a_t|s_t)}
}_{\rho_t:\ \text{采样分布校正}}
\cdot
g\Big(
\underbrace{
\frac{\pi_{\text{train},\theta}(a_t|s_t)}{\pi_{\text{train},\text{old}}(a_t|s_t)}
}_{r_t:\ \text{策略更新幅度}},
\,\hat A_t
\Big)
\Big]
}
$$

其中 $\rho_t$ 校正 TIM 造成的 behavior 与 proximal 错位，$r_t$ 与 clip 约束策略更新漂移；两个 old policy 一致时 $\rho_t\equiv 1$，形式退化为标准 PPO。

在该框架下，各方法的作用边界随之明确：**TIS 和 IcePop 分别用截断与双边 mask 处理 $\rho_t$ 的极端值；GSPO 在序列级处理 $r_t$，对 TIM 更宽容但没有显式分离它；R3 与精度、kernel 对齐则从源头让 $\rho_t$ 更接近 1。**

核心判断原则可以概括为：

> 先确认实际生成数据的分布，再确定作为 clip 锚点的策略。数据分布校正与策略更新约束是两项独立的工作，只有将二者分开，才能判断一个方法修正的是 policy lag、TIM，还是仅在抑制异常梯度。

---

# 参考资料

1. John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Radford, Oleg Klimov. *Proximal Policy Optimization Algorithms*. arXiv:1707.06347, 2017. [https://arxiv.org/abs/1707.06347](https://arxiv.org/abs/1707.06347)
2. Jacob Hilton, Karl Cobbe, John Schulman. *Batch Size-invariance for Policy Optimization*. NeurIPS 2022. [https://arxiv.org/abs/2110.00641](https://arxiv.org/abs/2110.00641)
3. Feng Yao, Liyuan Liu, Dinghuai Zhang, Chengyu Dong, Jingbo Shang, Jianfeng Gao. *On the Rollout-Training Mismatch in Modern RL Systems*. NeurIPS 2025 Workshop. [https://openreview.net/forum?id=8MHqvb4lK9](https://openreview.net/forum?id=8MHqvb4lK9)
4. Chujie Zheng et al. *Group Sequence Policy Optimization*. arXiv:2507.18071, 2025. [https://arxiv.org/abs/2507.18071](https://arxiv.org/abs/2507.18071)
5. Wenhan Ma et al. *Stabilizing MoE Reinforcement Learning by Aligning Training and Inference Routers*. ICML 2026. [https://arxiv.org/abs/2510.11370](https://arxiv.org/abs/2510.11370)
6. Ling Team, Inclusion AI. *Every Step Evolves: Scaling Reinforcement Learning for Trillion-Scale Thinking Model*. arXiv:2510.18855, 2025. [https://arxiv.org/abs/2510.18855](https://arxiv.org/abs/2510.18855)
7. Yingru Li et al. *Trust Region Masking for Long-Horizon LLM Reinforcement Learning*. arXiv:2512.23075, 2025. [https://arxiv.org/abs/2512.23075](https://arxiv.org/abs/2512.23075)
8. verl Documentation. *Mathematical Formulations of Rollout Correction Methods in verl*. [https://verl.readthedocs.io/en/latest/algo/rollout_corr_math.html](https://verl.readthedocs.io/en/latest/algo/rollout_corr_math.html)
