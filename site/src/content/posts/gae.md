---
title: "GAE 与 Monte Carlo、TD Error"
date: "2025-08-21"
tags: ["PPO", "GAE", "TD Error"]
category: "强化学习"
excerpt: "MC 估计无偏但方差较大，TD 估计方差小但引入自举偏差。GAE 权衡两者之间的优劣，是 PPO 中常用的优势估计方案。"
---

在 PPO（Proximal Policy Optimization）中，策略更新的质量完全依赖于**优势函数的估计精度**。估计太噪（高方差）→ 训练震荡；估计太偏（高偏差）→ 策略走偏。本文从 MC 与 TD 的核心矛盾出发，逐步推导出 GAE 的设计动机与数学原理。

---

# 一、优势函数的定义与作用

PPO 的策略梯度依赖优势函数（Advantage Function）：

$$
A^\pi(s,a) = Q^\pi(s,a) - V^\pi(s)
$$

其中：

- $Q^\pi(s,a)$：在状态 $s$ 下执行动作 $a$ 后，遵循策略 $\pi$ 的期望累积回报
- $V^\pi(s)$：在状态 $s$ 下遵循策略 $\pi$ 的期望累积回报（策略平均水平）

**直观含义**：$A_t > 0$ 表示当前动作优于平均，应增加其概率；$A_t < 0$ 则相反。

**核心问题**：$Q^\pi$ 和 $V^\pi$ 都是期望值，无法直接获得，必须通过采样估计。如何稳定、准确地估计 $A_t$，正是 GAE 要解决的核心。

---

# 二、蒙特卡洛估计（Monte Carlo）

## 1. 计算方式

蒙特卡洛方法基于**完整轨迹**计算累积回报 $G_t$：

$$
G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots + \gamma^{T-t} r_T
$$

MC 优势估计用 $G_t$ 减去 Critic 的价值估计：

$$
A_t^{MC} = G_t - V_\theta(s_t)
$$

## 2. 无偏但方差大

**无偏性**来自 $Q$ 函数的定义：

$$
Q^\pi(s_t,a_t) = \mathbb{E}_\pi[G_t \mid s_t, a_t]
$$

因此 $G_t$ 是 $Q^\pi(s_t,a_t)$ 的无偏估计，与 $V_\theta$ 是否准确无关。

> **注意**：准确地说，$A_t^{MC}$ 是 $Q^\pi(s_t,a_t) - V_\theta(s_t)$ 的无偏估计。只有当 $V_\theta$ 收敛到真实 $V^\pi$ 时，$A_t^{MC}$ 才是真实优势函数的无偏估计。

**高方差**来自累积回报 $G_t$ 本身。根据方差可加性：

$$
\text{Var}(G_t) = \sum_{k=t}^T \gamma^{2(k-t)} \text{Var}(r_k)
$$

方差随轨迹长度 $T$、折扣因子 $\gamma$ 接近 1 以及环境随机性增大而显著放大，直接导致策略梯度估计噪声过大，训练不稳定。

## 3. 其他性质

- **需要完整轨迹**：必须等 episode 结束才能计算 $G_t$，样本效率低
- **无自举（Bootstrapping）**：不依赖 $V_\theta$ 估计未来回报，不引入自举偏差

---

# 三、时序差分误差（TD Error）

## 1. 计算方式

TD（Temporal Difference） 方法只用**单步转移**信息，定义单步 TD 误差：

$$
\delta_t = r_t + \gamma V_\theta(s_{t+1}) - V_\theta(s_t)
$$

以 $\delta_t$ 作为优势估计：

$$
A_t^{TD} = \delta_t
$$

**直观含义**：$\delta_t$ 衡量「实际得到的即时回报 + 下一状态价值估计」与「当前 Critic 预测」之间的差值，是 Critic 网络的更新信号。

## 2. 低方差但有偏

**低方差**：$\delta_t$ 只依赖一步奖励 $r_t$ 和一步价值估计 $V_\theta(s_{t+1})$，后者作为期望的近似已对噪声做了平滑：

$$
\text{Var}(A_t^{TD}) = \text{Var}(r_t) + \gamma^2\,\text{Var}(V_\theta(s_{t+1}))
$$

相比 $G_t$，方差显著更小，对长轨迹任务尤为突出。

**有偏性**来自**自举（Bootstrapping）**：TD 用当前不准确的 $V_\theta$ 来估计 $Q$ 值，当 $V_\theta \neq V^\pi$ 时：

$$
\mathbb{E}_\pi\bigl[r_t + \gamma V_\theta(s_{t+1}) \mid s_t, a_t\bigr] \neq Q^\pi(s_t, a_t)
$$

误差会在价值函数迭代更新过程中累积传播，导致系统性偏差。

## 3. 其他性质

- **无需等轨迹结束**：每步可立即计算，样本效率高，是 GAE 的基础积木
- **短视**：仅看一步，不考虑多步未来的影响

---

# 四、广义优势估计（GAE）

## 1. 动机

纯 TD（$\lambda=0$）位于低方差、高偏差的一端，纯 MC（$\lambda=1$）位于低偏差、高方差的另一端；GAE 通过 $\lambda \in [0,1]$ 在二者之间做**可控插值**。

## 2. 公式

**展开式**（原理理解）：

$$
A_t^{GAE(\gamma,\lambda)} = \sum_{l=0}^{T-t-1} (\gamma\lambda)^l \cdot \delta_{t+l}
$$

对未来各步 TD 误差做指数加权求和，权重 $(\gamma\lambda)^l$ 随步数 $l$ 指数衰减。

**递归式**（代码实现）：

$$
A_t^{GAE} = \delta_t + \gamma\lambda \cdot A_{t+1}^{GAE}
$$

从最后一步 $T$ 往前计算（$A_T^{GAE} = \delta_T$），一次遍历轨迹即可完成，内存友好。

## 3. 边界情况

- **$\lambda = 0$**：退化为单步 TD——低方差、高偏差
$$
A_t^{GAE} = \delta_t
$$
- **$\lambda = 1$**：退化为蒙特卡洛估计——低偏差、高方差
$$
A_t^{GAE} = \sum_{l=0}^{T-t-1} \gamma^l \delta_{t+l} = G_t - V_\theta(s_t) = A_t^{MC}
$$

下图共用一条从 $s_t$ 到终点的时间轴：MC 使用整段真实回报，TD 在一步后用 Critic 自举，GAE 则同时纳入多种跨度，并让更远的 TD 误差按 $(\gamma\lambda)^l$ 衰减。

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:620px" viewBox="0 0 680 420" role="img" aria-labelledby="gae-backup-title gae-backup-desc">
<title id="gae-backup-title">MC、TD 与 GAE 的回传跨度和偏差方差折中</title>
<desc id="gae-backup-desc">时间轴从状态 s t 延伸到终点。蒙特卡洛跨越完整轨迹；单步 TD 只前进一步并从下一状态价值自举；GAE 混合从一步到更长距离的 TD 误差，距离越远权重按 gamma lambda 的 l 次方衰减、线条越淡。lambda 从零增至一时偏差降低而方差升高。</desc>
<defs>
<marker id="gae-time-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#888780" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="340" y="22" font-size="16" font-weight="600" text-anchor="middle" fill="currentColor">同一条轨迹，不同的 backup 跨度</text>
<text x="340" y="43" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.65">跨度越长，真实奖励越多、自举依赖越少，但采样噪声越大</text>
<text x="38" y="76" font-size="12.5" fill="currentColor" opacity="0.65">时间</text>
<path d="M88 72 H642" fill="none" stroke="#888780" stroke-width="1.25" marker-end="url(#gae-time-axis-arrow)"/>
<line x1="130" y1="76" x2="130" y2="340" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.12"/>
<line x1="225" y1="76" x2="225" y2="340" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.12"/>
<line x1="320" y1="76" x2="320" y2="340" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.12"/>
<line x1="415" y1="76" x2="415" y2="340" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.12"/>
<line x1="600" y1="76" x2="600" y2="340" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.12"/>
<circle cx="130" cy="72" r="5" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.5"/>
<circle cx="225" cy="72" r="4" fill="#F1EFE8" stroke="#888780" stroke-width="1"/>
<circle cx="320" cy="72" r="4" fill="#F1EFE8" stroke="#888780" stroke-width="1"/>
<circle cx="415" cy="72" r="4" fill="#F1EFE8" stroke="#888780" stroke-width="1"/>
<circle cx="600" cy="72" r="5" fill="#FAEEDA" stroke="#BA7517" stroke-width="1.5"/>
<text x="130" y="96" font-size="12.5" text-anchor="middle" fill="currentColor">sₜ</text>
<text x="225" y="96" font-size="12.5" text-anchor="middle" fill="currentColor">sₜ₊₁</text>
<text x="320" y="96" font-size="12.5" text-anchor="middle" fill="currentColor">sₜ₊₂</text>
<text x="415" y="96" font-size="12.5" text-anchor="middle" fill="currentColor">sₜ₊₃</text>
<text x="505" y="93" font-size="16" text-anchor="middle" fill="currentColor" opacity="0.55">…</text>
<text x="600" y="96" font-size="12.5" text-anchor="middle" fill="currentColor">终点</text>
<rect x="28" y="114" width="4" height="42" rx="2" fill="#0F6E56"/>
<text x="42" y="135" font-size="14" font-weight="600" dominant-baseline="central" fill="currentColor">MC</text>
<path d="M130 126 H600" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round"/>
<circle cx="600" cy="126" r="4" fill="#0F6E56"/>
<text x="365" y="149" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.72">完整奖励序列，一直计算到终点 · 不 bootstrap</text>
<rect x="28" y="174" width="4" height="44" rx="2" fill="#BA7517"/>
<text x="42" y="196" font-size="14" font-weight="600" dominant-baseline="central" fill="currentColor">TD</text>
<path d="M130 190 H225" fill="none" stroke="#BA7517" stroke-width="3" stroke-linecap="round"/>
<circle cx="225" cy="190" r="4" fill="#BA7517"/>
<rect x="244" y="173" width="176" height="34" rx="8" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="332" y="190" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">一步后 bootstrap：V(sₜ₊₁)</text>
<text x="438" y="196" font-size="12.5" fill="currentColor" opacity="0.68">仅用 rₜ + γV(sₜ₊₁)</text>
<line x1="28" y1="232" x2="652" y2="232" stroke="currentColor" stroke-width="0.5" opacity="0.2"/>
<rect x="28" y="248" width="4" height="94" rx="2" fill="#0F6E56"/>
<text x="42" y="278" font-size="14" font-weight="600" fill="currentColor">GAE</text>
<text x="42" y="297" font-size="12" fill="currentColor" opacity="0.62">多尺度</text>
<text x="42" y="313" font-size="12" fill="currentColor" opacity="0.62">加权和</text>
<path d="M130 255 H225" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round"/>
<circle cx="225" cy="255" r="3.5" fill="#0F6E56"/>
<text x="177" y="248" font-size="11.5" text-anchor="middle" fill="#0F6E56">l = 0 · 权重 1</text>
<path d="M130 280 H320" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round" opacity="0.78"/>
<circle cx="320" cy="280" r="3.5" fill="#0F6E56" opacity="0.78"/>
<text x="225" y="273" font-size="11.5" text-anchor="middle" fill="#0F6E56" opacity="0.78">l = 1 · 权重 γλ</text>
<path d="M130 305 H415" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
<circle cx="415" cy="305" r="3.5" fill="#0F6E56" opacity="0.55"/>
<text x="272" y="298" font-size="11.5" text-anchor="middle" fill="#0F6E56" opacity="0.72">l = 2 · 权重 (γλ)²</text>
<path d="M130 330 H600" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round" opacity="0.28"/>
<circle cx="600" cy="330" r="3.5" fill="#0F6E56" opacity="0.38"/>
<text x="365" y="323" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.52">更远的 l · 权重 (γλ)ˡ</text>
<rect x="45" y="362" width="178" height="34" rx="8" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="134" y="379" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">TD · 低方差 / 高偏差</text>
<rect x="251" y="362" width="178" height="34" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="340" y="379" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#2C2C2A">GAE · λ 控制折中</text>
<rect x="457" y="362" width="178" height="34" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="546" y="379" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#04342C">MC · 高方差 / 低偏差</text>
<text x="340" y="412" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.72">λ 从 0 增至 1：自举偏差下降，采样方差上升</text>
</svg>
</div>

GAE 不是选择某一个固定回传长度，而是把不同距离的 TD 误差叠加起来；$\lambda$ 越大，远期项衰减越慢，估计越接近 MC。

## 4. 两个超参：$\gamma$ 与 $\lambda$ 的区别

| 超参 | 含义 | 典型值 | 属于 |
|------|------|--------|------|
| $\gamma$（折扣因子） | 未来奖励的衰减权重；$\gamma=0$ 只看即时奖励，$\gamma=1$ 完全不折扣 | $0.97 \sim 0.99$ | 问题本身（决定智能体"多近视"） |
| $\lambda$（GAE 系数） | 偏差-方差的权衡旋钮；控制优势估计的平滑度 | $0.90 \sim 0.97$ | 算法设计（独立于环境定义） |

## 5. 核心特性

**偏差-方差可控权衡**

$\lambda$ 小时更像 TD，$\lambda$ 大时更像 MC；实践中常取 $\lambda \approx 0.95$，在偏差与方差之间折中。

**指数平滑，梯度更稳定**

TD 误差 $\delta_t$ 往往跳变剧烈（符号反复变化），GAE 通过指数加权将跳变「抹平」，使优势估计随时间更平滑，策略梯度信号更一致。

**天然适配 PPO**

GAE 提供稳定、低噪的优势估计，与 PPO 的概率比裁剪（clip）机制形成稳定 + 高效的训练闭环。

---

# 五、三种方法全面对比

| 特性 | 蒙特卡洛（MC） | 单步 TD | GAE（$\lambda \approx 0.95$） |
|------|---------------|---------|------------------------------|
| 对 $Q$ 的估计偏差 | 无 | 高（自举偏差） | 低（介于两者之间） |
| 估计方差 | 大 | 小 | 中等 |
| 依赖 Critic 程度 | 弱 | 极强 | 中 |
| 所需轨迹 | 完整轨迹 | 单步转移 | 任意长度片段 |
| 回溯长度 | 全轨迹 | 1 步 | 多步（指数衰减） |
| 训练稳定性 | 差 | 最好 | 好 |
| 收敛速度 | 快（但易发散） | 慢 | 快 |
| 样本效率 | 低 | 高 | 高 |
| 适用场景 | 短轨迹、奖励密集 | Critic 很准的简单任务 | 通用（PPO 标配） |

---

# 六、总结

蒙特卡洛估计通过完整轨迹提供无偏的 $Q$ 估计，但方差极大；TD 误差方差极小，但自举偏差可能导致策略更新方向错误。

GAE 引入 $\lambda$ 实现了从 TD 到 MC 的全谱覆盖：

$$
\lambda=0 \;\longrightarrow\; \text{单步 TD} \;\longrightarrow\; \lambda=0.95 \;\longrightarrow\; \text{GAE 标配} \;\longrightarrow\; \lambda=1 \;\longrightarrow\; \text{蒙特卡洛}
$$

在 PPO 的实际应用中，$\lambda \approx 0.95$、$\gamma \approx 0.99$ 是最常用的配置，配合优势标准化（减均值除以标准差）进一步稳定训练。
