---
title: "KL 散度的近似估计"
date: "2025-03-28"
tags: ["KL 散度", "估计器"]
category: "数学基础"
excerpt: "系统梳理 k1、k2、k3 三类 KL 近似估计器的定义、偏差-方差权衡与实践选型。"
---

在 LLM 训练（如 RL 等）里，常常希望约束新策略 $\pi_\theta$ 不要偏离参考策略 $\pi_{\text{ref}}$（KL 散度约束）。理论上，需要对每个上下文状态 $s_t$ 计算：

$$
D_{\text{KL}}\!\left(\pi_\theta(\cdot|s_t)\|\pi_{\text{ref}}(\cdot|s_t)\right)
=\sum_{v\in\mathcal{V}}\pi_\theta(v|s_t)\log\frac{\pi_\theta(v|s_t)}{\pi_{\text{ref}}(v|s_t)}
$$

- 词表 $\mathcal{V}$ 往往有数万到数十万 token，**若在训练中对每个 token 位置都完整遍历词表计算 KL，代价过于高昂**。
- 同时，我们拿到的大多是**采样 token 的 logprob，而非完整分布**。

> 那么能否只用采样到的 token 来估计 KL？

基于该问题，本文将介绍三种常见 KL 近似：**k1、k2、k3**，并说明它们在偏差、方差与训练稳定性上的差异。

---

# 一、符号约定

首先统一估计目标为 $D_{\text{KL}}(Q\|P)$，样本来自 $Q$（$x\sim Q$），并定义比值：

$$
r(x)=\frac{P(x)}{Q(x)}
$$

在 LLM token 级别，约定：
- $Q(\cdot|s_t)=\pi_\theta(\cdot|s_t)$，表示当前待优化策略；
- $P(\cdot|s_t)=\pi_{\text{ref}}(\cdot|s_t)$，表示参考策略。

在该约定下，有

$$
D_{\text{KL}}(Q\|P)=\mathbb{E}_{x\sim Q}\left[\log\frac{Q(x)}{P(x)}\right]
=\mathbb{E}_{x\sim Q}\left[-\log r(x)\right]
$$

给定样本 $x_1,\dots,x_N\sim Q$，即可在样本层面构造 k1、k2、k3 三类估计器。


---

# 二、k1 估计

k1 直接对 $-\log r$ 做蒙特卡洛平均；**该估计无偏，但对 log-ratio 的采样噪声敏感，方差较大**。

$$
k_1(x)=-\log r(x)
$$


由于
$$
\mathbb{E}_Q[k_1]=\mathbb{E}_Q[-\log r]=D_{\text{KL}}(Q\|P),
$$
故 k1 为无偏估计。其方差满足
$$
\mathrm{Var}(\hat D_{k1})=\frac{1}{N}\mathrm{Var}_Q(-\log r),
$$
当 $r$ 呈重尾或存在异常大比值时，$\mathrm{Var}_Q(-\log r)$ 往往显著增大，因此在训练中容易出现 batch 级抖动。

---

# 三、k2 估计

k2 利用“小偏移”二阶近似，把一阶 log-ratio 替换为二次项；**该估计更平滑，但属于有偏近似**。

记 $\delta=\log r$，对 $e^\delta$ 在 $\delta=0$ 处展开，并代入 $\mathbb{E}_Q[e^\delta]-1=0$，得
$$
\mathbb{E}_Q\!\left[(1+\delta+\tfrac{1}{2}\delta^2+O(\delta^3))-1\right]=0
\Rightarrow
\mathbb{E}_Q[-\delta]=\frac{1}{2}\mathbb{E}_Q[\delta^2]+O(\mathbb{E}_Q|\delta|^3).
$$
因此在小偏移区间（$|\delta|$ 小）有
$$
D_{\text{KL}}(Q\|P)=\mathbb{E}_Q[-\log r]\approx \frac{1}{2}\mathbb{E}_Q[(\log r)^2].
$$

得到

$$
k_2(x)=\frac{1}{2}\big(\log r(x)\big)^2
$$

其低方差来源可用局部模型说明：在小步更新区间，$\delta$ 通常集中在 0 附近。若近似 $\delta\sim\mathcal N(0,\sigma^2)$，则
$$
\mathrm{Var}(k_1)\approx\sigma^2,\qquad
\mathrm{Var}(k_2)=\mathrm{Var}\!\left(\frac{1}{2}\delta^2\right)\approx\frac{1}{2}\sigma^4.
$$
当 $\sigma^2<2$ 时，$k_2$ 的单样本方差低于 $k_1$；而在实际的小更新设置中通常有 $\sigma^2\ll1$。但由于该式来自局部近似，分布差异增大时偏差会同步变大。

---

# 四、k3 估计

k3 则在 k1 上加入零均值控制变量 $(r-1)$；**该估计保持无偏，且通常可降低方差并保证单样本非负**。

常见形式为：

$$
k_3(x)=(r(x)-1)-\log r(x)
$$


其性质如下：

1. **无偏性**  
   因为 $\mathbb{E}_Q[r-1]=\mathbb{E}_Q[P/Q]-1=1-1=0$，所以 $\mathbb{E}_Q[k_3]=\mathbb{E}_Q[-\log r]=D_{\text{KL}}(Q\|P)$。

2. **单样本非负性**  
   由不等式 $x-1\ge\log x$（$x>0$）可得 $k_3(x)\ge 0$，因此训练监控中的近似 KL 曲线更稳定且可解释性更好。

3. **低方差机制**  
   令 $Z=-\log r,\ Y=r-1$，则 $k_3=Z+Y$ 且 $\mathbb{E}[Y]=0$。一般控制变量估计写作 $Z+cY$，对任意 $c$ 均无偏，其方差为
   $$
   \mathrm{Var}(Z+cY)=\mathrm{Var}(Z)+2c\,\mathrm{Cov}(Z,Y)+c^2\mathrm{Var}(Y).
   $$
   对 $c$ 求导令其为零，得最优系数
   $$
   c^*=-\frac{\mathrm{Cov}(Z,Y)}{\mathrm{Var}(Y)},
   $$
   此时方差达到最小值 $\mathrm{Var}(Z)\bigl(1-\rho^2\bigr)\le\mathrm{Var}(Z)$（$\rho=\mathrm{Corr}(Z,Y)$），即**最优控制变量的方差一定不高于 k1**。

   在小偏移区间（$r=e^\delta,\ \delta\approx0$）下，有 $Z=-\log e^\delta=-\delta$，$Y=e^\delta-1\approx\delta$（一阶 Taylor 近似），因此
   $$
   \mathrm{Cov}(Z,Y)\approx\mathrm{Cov}(-\delta,\,\delta)=-\mathrm{Var}(\delta),\quad
   \mathrm{Var}(Y)\approx\mathrm{Var}(\delta),\quad
   c^*\approx1.
   $$
   k3 的系数恰好取 $c=1$，在此区间内接近最优，故其方差也接近最低值，**在小偏移假设下严格低于 k1**。当策略偏移较大（$|\delta|$ 不可忽略）时，$c=1$ 可能偏离 $c^*$，上述保证不再成立。

---

# 五、汇总对比

记某 token 位置的两组 logprob 比值为：

$$
\log r_t=\log p_t-\log q_t,\qquad r_t=\exp(\log r_t)
$$

可得到三种 KL 散度的 token 级估计：

$$
k1_t=-(\log r_t),\quad
k2_t=\frac12(\log r_t)^2,\quad
k3_t=(r_t-1)-\log r_t
$$

| 估计器 | 单样本形式 | 无偏性（本设定） | 方差表现 | 稳定性 | 典型使用 |
|---|---|---|---|---|---|
| k1 | $-\log r$ | 是 | 相对较高 | 中等 | 离线评估、理论基线 |
| k2 | $\frac12(\log r)^2$ | 否（近似） | 通常较低 | 较好 | 小步更新时的 KL proxy |
| k3 | $(r-1)-\log r$ | 是 | 常优于 k1 | 好 | PPO/RLHF 训练监控与惩罚 |

---

# 六、PyTorch 实现示例

```python
import torch

def kl_estimators(logp_q: torch.Tensor, logp_p: torch.Tensor):
    """
    logp_q, logp_p: shape [batch, seq]
    返回每个样本的序列平均估计值
    """
    log_r = logp_p - logp_q
    r = torch.exp(log_r)

    k1 = -log_r
    k2 = 0.5 * (log_r ** 2)
    k3 = (r - 1.0) - log_r

    # token 平均 -> 每个样本一个标量
    k1_mean = k1.mean(dim=-1)
    k2_mean = k2.mean(dim=-1)
    k3_mean = k3.mean(dim=-1)
    return k1_mean, k2_mean, k3_mean
```

---

# 附录：估计器梯度计算

在训练中，KL 估计器通常作为惩罚项加入损失函数。理解每类估计器对 $\theta$ 产生的梯度信号，有助于解释它们在训练稳定性上的差异。

**设定**：参考策略 $\pi_{\text{ref}}$ 参数固定，仅对当前策略 $\pi_\theta$ 求梯度。记某 token $x$ 在两个策略下的 log 概率分别为

$$
\log q \triangleq \log\pi_\theta(x),\qquad \log p \triangleq \log\pi_{\text{ref}}(x),
$$

则 $\log r = \log p - \log q$，$r = e^{\log r}$。由链式法则，

$$
\nabla_\theta k_i(x) = \frac{\partial k_i}{\partial \log q}\cdot\nabla_\theta\log\pi_\theta(x).
$$

因此只需计算标量权重 $\partial k_i / \partial \log q$，再乘以策略的 score function $\nabla_\theta\log\pi_\theta(x)$。

---

## A.1　k1 的梯度

$$
k_1 = -\log r = \log q - \log p
$$

对 $\log q$ 求导：

$$
\frac{\partial k_1}{\partial \log q} = 1
$$

故

$$
\boxed{\nabla_\theta k_1(x) = \nabla_\theta\log\pi_\theta(x)}
$$

梯度权重恒为 $1$，**与当前策略和参考策略的偏离程度无关**，每个采样 token 对梯度的贡献大小完全相同。

---

## A.2　k2 的梯度

$$
k_2 = \frac{1}{2}(\log r)^2 = \frac{1}{2}(\log p - \log q)^2
$$

对 $\log q$ 求导：

$$
\frac{\partial k_2}{\partial \log q}
= (\log p - \log q)\cdot(-1)
= \log q - \log p
= -\log r
$$

故

$$
\boxed{\nabla_\theta k_2(x) = -\log r(x)\cdot\nabla_\theta\log\pi_\theta(x)}
$$

梯度权重为 $-\log r$：当策略偏离越大（$|\log r|$ 越大），梯度信号越强；当 $r\approx1$ 时梯度趋于零，**对已对齐的 token 自动施加近似为零的惩罚**。小偏移区间下 $-\log r\approx r-1$，与 k3 权重一致。

---

## A.3　k3 的梯度

$$
k_3 = (r - 1) - \log r,\qquad r = e^{\log p - \log q}
$$

分别计算两项对 $\log q$ 的导数：

$$
\frac{\partial r}{\partial \log q} = \frac{\partial\,e^{\log p - \log q}}{\partial \log q} = -r,\qquad
\frac{\partial \log r}{\partial \log q} = -1
$$

因此

$$
\frac{\partial k_3}{\partial \log q} = -r - (-1) = 1 - r
$$

故

$$
\boxed{\nabla_\theta k_3(x) = \bigl(1 - r(x)\bigr)\cdot\nabla_\theta\log\pi_\theta(x)}
$$

梯度权重为 $1-r$：
- 若 $r > 1$（参考策略对该 token 概率更高，当前策略"欠分配"），则 $1-r < 0$，更新方向使 $\log\pi_\theta(x)$ 增大，**将策略拉向参考策略**；
- 若 $r < 1$（当前策略"过分配"），则 $1-r > 0$，更新方向使 $\log\pi_\theta(x)$ 减小，同样**将策略拉向参考策略**。

由于 $r > 0$，权重 $1-r \in(-\infty, 1)$，**权重有界上限为 1**，这从梯度角度解释了 k3 在训练中的稳定性优势。

---

## A.4　梯度权重对比

| 估计器 | 梯度权重 $\partial k_i/\partial \log q$ | 权重范围 | 大偏移时行为 |
|---|---|---|---|
| k1 | $1$ | $\{1\}$ | 恒定，不随偏离变化 |
| k2 | $-\log r$ | $(-\infty, +\infty)$ | 随 $\|\log r\|$ 线性增大 |
| k3 | $1 - r$ | $(-\infty, 1)$ | 随 $r$ 增大而趋向 $-\infty$，上界有限 |

k2 和 k3 均在 $r\approx1$ 时梯度趋近于零，具有自适应调节强度的效果；但当 $r\gg1$ 时，k2 的权重 $-\log r$ 增长较温和（对数级），而 k3 的权重 $1-r$ 则线性趋向负无穷，**可能在策略剧烈偏移时产生过大梯度**，需配合裁剪使用。

