---
title: "PPO 梯度推导"
date: "2025-08-20"
tags: ["PPO", "策略梯度", "Actor-Critic"]
category: "强化学习"
excerpt: "策略梯度经由 Actor-Critic 和重要性采样过渡到 PPO-Clip，核心在于理解 ratio 如何重加权旧策略样本，以及 clip 如何截断分段梯度。"
---

PPO（Proximal Policy Optimization）是基于策略梯度的强化学习算法。它的核心不是重新定义一个完全不同的优化方向，而是在**策略梯度**的基础上加入**重要性采样**和**裁剪约束**，使同一批轨迹可以被重复训练，同时避免新策略偏离旧策略过远。

本文围绕 PPO 的梯度更新主线，逐步得到 Actor-Critic、重要性采样目标以及 PPO-Clip 目标，并重点分析 PPO 目标函数对策略参数的梯度形式。

---

# 一、符号约定

设策略为随机策略：

$$
a_t \sim \pi_\theta(\cdot|s_t)
$$

其中 $\theta$ 是策略网络参数。一次轨迹记为：

$$
\tau = (s_0,a_0,r_0,s_1,a_1,r_1,\dots,s_{T-1},a_{T-1},r_{T-1})
$$

轨迹回报定义为：

$$
R(\tau)=\sum_{t=0}^{T-1}\gamma^t r_t
$$

单步后的折扣回报定义为：

$$
G_t=\sum_{l=0}^{T-t-1}\gamma^l r_{t+l}
$$

价值函数与优势函数定义为：

$$
V^\pi(s_t)=\mathbb{E}_\pi[G_t|s_t]
$$

$$
Q^\pi(s_t,a_t)=\mathbb{E}_\pi[G_t|s_t,a_t]
$$

$$
A^\pi(s_t,a_t)=Q^\pi(s_t,a_t)-V^\pi(s_t)
$$

PPO 中通常用 $\pi_{\theta_{\text{old}}}$ 表示采样轨迹时的旧策略，用 $\pi_\theta$ 表示正在更新的新策略。定义概率比值：

$$
r_t(\theta)=
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
$$

这里的 $r_t(\theta)$ 表示 ratio，和奖励符号 $r_t$ 不是同一个量。为了贴近 PPO 论文习惯，后文仍沿用 $r_t(\theta)$ 表示概率比值。

在实现中，常用 log probability 计算：

$$
r_t(\theta)=
\exp\left(
\log \pi_\theta(a_t|s_t)
-
\log \pi_{\theta_{\text{old}}}(a_t|s_t)
\right)
$$

其中 $\log \pi_{\theta_{\text{old}}}(a_t|s_t)$ 来自采样时缓存的旧策略输出，在更新过程中视为常数。

---

# 二、策略梯度基础推导

## 1. 优化目标

策略优化的总体目标是最大化期望回报：

$$
J(\theta)=\mathbb{E}_{\tau\sim \pi_\theta}[R(\tau)]
$$

写成对所有轨迹的求和形式：

$$
J(\theta)=\sum_\tau P(\tau|\theta)R(\tau)
$$

其中 $P(\tau|\theta)$ 表示在策略 $\pi_\theta$ 下采样到轨迹 $\tau$ 的概率。

## 2. 对目标求梯度

对 $J(\theta)$ 求梯度：

$$
\begin{aligned}
\nabla_\theta J(\theta)
&= \nabla_\theta \sum_\tau P(\tau|\theta)R(\tau) \\
&= \sum_\tau R(\tau)\nabla_\theta P(\tau|\theta)
\end{aligned}
$$

引入 log-derivative trick：

$$
\nabla_\theta P(\tau|\theta)
=
P(\tau|\theta)\nabla_\theta \log P(\tau|\theta)
$$

代入可得：

$$
\begin{aligned}
\nabla_\theta J(\theta)
&= \sum_\tau R(\tau)P(\tau|\theta)
\nabla_\theta \log P(\tau|\theta) \\
&= \mathbb{E}_{\tau\sim\pi_\theta}
\left[
R(\tau)\nabla_\theta \log P(\tau|\theta)
\right]
\end{aligned}
$$

> **关键结论**：无法直接对采样过程求导时，可以转为对轨迹概率的 log probability 求导。

## 3. 展开轨迹概率

轨迹概率可写为：

$$
P(\tau|\theta)
=
\rho_0(s_0)
\prod_{t=0}^{T-1}
\pi_\theta(a_t|s_t)
P(s_{t+1}|s_t,a_t)
$$

取对数：

$$
\log P(\tau|\theta)
=
\log \rho_0(s_0)
+
\sum_{t=0}^{T-1}\log \pi_\theta(a_t|s_t)
+
\sum_{t=0}^{T-1}\log P(s_{t+1}|s_t,a_t)
$$

对 $\theta$ 求梯度时，初始状态分布 $\rho_0$ 和环境转移概率 $P(s_{t+1}|s_t,a_t)$ 与策略参数无关，因此梯度为 0：

$$
\nabla_\theta \log P(\tau|\theta)
=
\sum_{t=0}^{T-1}
\nabla_\theta \log \pi_\theta(a_t|s_t)
$$

代回策略梯度：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}_{\tau\sim\pi_\theta}
\left[
R(\tau)
\sum_{t=0}^{T-1}
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

这就是 REINFORCE 形式的策略梯度。

## 4. 从整条轨迹回报到单步优势

直接用整条轨迹回报 $R(\tau)$ 评估每个动作，方差较大。更常见的形式是用从当前时刻开始的回报 $G_t$：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}_{\tau\sim\pi_\theta}
\left[
\sum_{t=0}^{T-1}
G_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

进一步可以减去只依赖状态的 baseline $b(s_t)$：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}_{\tau\sim\pi_\theta}
\left[
\sum_{t=0}^{T-1}
(G_t-b(s_t))
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

baseline 不改变梯度期望，因为：

$$
\begin{aligned}
\mathbb{E}_{a_t\sim\pi_\theta(\cdot|s_t)}
\left[
b(s_t)\nabla_\theta\log\pi_\theta(a_t|s_t)
\right]
&=
b(s_t)
\sum_{a_t}\pi_\theta(a_t|s_t)
\nabla_\theta\log\pi_\theta(a_t|s_t) \\
&=
b(s_t)
\sum_{a_t}\nabla_\theta\pi_\theta(a_t|s_t) \\
&=
b(s_t)\nabla_\theta
\sum_{a_t}\pi_\theta(a_t|s_t) \\
&=
b(s_t)\nabla_\theta 1 \\
&=0
\end{aligned}
$$

通常令 baseline 为价值函数 $V^\pi(s_t)$，则得到优势函数形式：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}_{\tau\sim\pi_\theta}
\left[
\sum_{t=0}^{T-1}
A^\pi(s_t,a_t)
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

> 如果 $A^\pi(s_t,a_t)>0$，说明动作 $a_t$ 比当前状态下的平均动作更好，应提高其概率；如果 $A^\pi(s_t,a_t)<0$，说明动作 $a_t$ 比当前状态下的平均动作更差，应降低其概率。

---

# 三、Actor-Critic 梯度形式

## 1. Actor 目标

在 Actor-Critic 中，Actor 表示策略 $\pi_\theta$，Critic 估计价值函数 $V_\phi$。用估计优势 $\hat A_t$ 替代真实优势，可写出 Actor 的最大化目标：

$$
J_{\text{actor}}(\theta)
=
\mathbb{E}_t
\left[
\hat A_t \log \pi_\theta(a_t|s_t)
\right]
$$

其中 $\hat A_t$ 通常由 TD Error、GAE 或 MC return 得到。在更新 Actor 时，$\hat A_t$ 一般视为常数，即不让 Actor loss 的梯度回传进优势估计过程。

对 Actor 目标求梯度：

$$
\nabla_\theta J_{\text{actor}}(\theta)
=
\mathbb{E}_t
\left[
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

若使用梯度下降实现，则通常最小化负目标：

$$
L_{\text{actor}}(\theta)
=
-
\mathbb{E}_t
\left[
\hat A_t \log \pi_\theta(a_t|s_t)
\right]
$$

对应梯度为：

$$
\nabla_\theta L_{\text{actor}}(\theta)
=
-
\mathbb{E}_t
\left[
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

## 2. Critic 目标

Critic 的目标是拟合回报目标 $\hat R_t$。常见形式为：

$$
L_{\text{critic}}(\phi)
=
\frac{1}{2}
\mathbb{E}_t
\left[
\left(V_\phi(s_t)-\hat R_t\right)^2
\right]
$$

其中 $\hat R_t$ 可以由 MC return 或 GAE return 构造。例如：

$$
\hat R_t = \hat A_t + V_{\phi_{\text{old}}}(s_t)
$$

其中 $\hat A_t$ 的具体构造（如 GAE）见第七节。

对 Critic 参数求梯度：

$$
\nabla_\phi L_{\text{critic}}(\phi)
=
\mathbb{E}_t
\left[
\left(V_\phi(s_t)-\hat R_t\right)
\nabla_\phi V_\phi(s_t)
\right]
$$

**关键区别**：Actor 梯度作用在动作概率上，Critic 梯度作用在状态价值预测上。
> Actor 负责改变策略分布，Critic 负责提供更稳定的优势估计。

---

# 四、重要性采样与 PPO 代理目标

## 1. 数据来自旧策略

普通策略梯度要求数据来自当前策略 $\pi_\theta$：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}_{t\sim\pi_\theta}
\left[
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

但 PPO 会用旧策略 $\pi_{\theta_{\text{old}}}$ 采样一批数据，然后在这批数据上做多轮 minibatch 更新。此时数据分布来自旧策略，因此需要用重要性采样把期望改写到旧策略分布下。

对于任意函数 $f(x)$：

$$
\mathbb{E}_{x\sim p}[f(x)]
=
\int p(x)f(x)dx
=
\int \frac{p(x)}{q(x)}q(x)f(x)dx
=
\mathbb{E}_{x\sim q}
\left[
\frac{p(x)}{q(x)}f(x)
\right]
$$

如果直接把这个公式套到整条轨迹上，应该得到轨迹级别的重要性采样比值。把新旧策略下的轨迹概率相除：

$$
\begin{aligned}
\frac{P(\tau|\theta)}
{P(\tau|\theta_{\text{old}})}
&=
\frac{
\rho_0(s_0)
\prod_{t=0}^{T-1}
\pi_\theta(a_t|s_t)
P(s_{t+1}|s_t,a_t)
}{
\rho_0(s_0)
\prod_{t=0}^{T-1}
\pi_{\theta_{\text{old}}}(a_t|s_t)
P(s_{t+1}|s_t,a_t)
} \\
&=
\prod_{t=0}^{T-1}
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
\end{aligned}
$$

其中初始状态分布 $\rho_0$ 和环境转移概率 $P(s_{t+1}|s_t,a_t)$ 都被抵消。

因此，理论上可以把新策略下的期望改写为旧策略下的期望：

$$
\mathbb{E}_{\tau\sim\pi_\theta}[R(\tau)]
=
\mathbb{E}_{\tau\sim\pi_{\theta_{\text{old}}}}
\left[
\frac{P(\tau|\theta)}
{P(\tau|\theta_{\text{old}})}
R(\tau)
\right]
$$

但这个轨迹级别的比值是很多步概率比值的连乘，轨迹稍长时方差会非常大。PPO 不直接使用完整轨迹比值，而是构造一个局部代理目标：**状态分布沿用旧策略采样得到的经验分布，只在动作分布上用新旧策略的单步概率比值做修正**。

## 2. 从梯度反推代理目标

局部代理目标的具体形式并不靠直接构造目标函数得到，而是**先在梯度表达式上做采样修正，再把修正后的梯度写回成某个函数的导数（反推）**，那个函数就是要找的代理目标。

本节开头的策略梯度，固定状态 $s_t$，只在动作维度上做重要性采样：

$$
\mathbb{E}_{a_t\sim\pi_\theta(\cdot|s_t)}
\left[
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
=
\mathbb{E}_{a_t\sim\pi_{\theta_{\text{old}}}(\cdot|s_t)}
\left[
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

其中的权重就是符号约定里的单步概率比值：

$$
r_t(\theta)=
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
$$

这一步是精确的。接着把状态按旧策略采样到的经验分布求平均，得到修正后的梯度估计：

$$
\hat g(\theta)
=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
r_t(\theta)
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

这一步则是近似：真正的策略梯度要求状态也来自新策略的访问分布 $d_\theta$，这里直接用旧策略的 $d_{\theta_{\text{old}}}$ 代替。

接下来反推 $\hat g(\theta)$ 是谁的梯度，即把它写成 $\nabla_\theta(\cdots)$ 的形式，才可以进行自动微分。关键在于 $r_t(\theta)\nabla_\theta\log\pi_\theta(a_t|s_t)$ 本身是一个完整的导数，且旧策略概率与 $\theta$ 无关，于是：

$$
r_t(\theta)
\nabla_\theta \log \pi_\theta(a_t|s_t)
=
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
\cdot
\frac{\nabla_\theta \pi_\theta(a_t|s_t)}
{\pi_\theta(a_t|s_t)}
=
\frac{\nabla_\theta \pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
=
\nabla_\theta r_t(\theta)
$$

代回原公式 $\hat g(\theta)$ 后，由于 $\hat A_t$ 与采样分布 $\pi_{\theta_{\text{old}}}$ 都不依赖 $\theta$，因此梯度算子可以提到期望外：

$$
\begin{aligned}
\hat g(\theta)
&=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
\hat A_t
\nabla_\theta r_t(\theta)
\right] \\
&=
\nabla_\theta
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
r_t(\theta)\hat A_t
\right]
\end{aligned}
$$

此时可得到 PPO 的未裁剪**代理目标**，通常记为 $J^{\text{PG}}(\theta)$，其中 PG 表示 policy gradient：

$$
J^{\text{PG}}(\theta)
=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
r_t(\theta)\hat A_t
\right]
$$

> $J^{\text{PG}}$ 由梯度反推出来，而非先写目标再求导。代理目标里出现 $r_t(\theta)$ 而不是 $\log\pi_\theta(a_t|s_t)$，原因在于重要性采样权重 $r_t$ 和 log 梯度合并成了 $\nabla_\theta r_t$。

这里的 $\hat A_t$ 由旧策略采样得到，在一轮 PPO 更新中视为常数。需要强调两点：

- $J^{\text{PG}}$ **不是**把普通 Actor-Critic 目标里的 $\log\pi_\theta(a_t|s_t)$ 做代数变形得到的。$\mathbb{E}_t[\hat A_t\log\pi_\theta]$ 与 $J^{\text{PG}}$ 都只是“求导之后能得到策略梯度”的替代目标，数值本身没有意义；两者的联系仅在于 $\theta=\theta_{\text{old}}$（此时 $r_t=1$）处梯度相同，见下一节。
- $J^{\text{PG}}$ 也不是原始回报 $J(\theta)$ 的完全等价改写。上面的推导里有两处只在旧策略附近成立的近似：状态分布被冻结为 $d_{\theta_{\text{old}}}$，$\hat A_t$ 被冻结为旧策略下的估计。因此 $J^{\text{PG}}$ 是**旧策略附近的局部代理目标**：**当新旧策略差距较小时，它可以近似反映新策略相对旧策略的改进方向**；$r_t$ 一旦偏离 1 太多，近似就失效（**后续引入 clip 的原因**）。

**补充：更严格的推导路线。** 从梯度反推的好处是直观，代价是只能保证 $\theta=\theta_{\text{old}}$ 一点上梯度正确，说不清代理目标本身的数值意味着什么。TRPO 与 PPO 原论文走的是另一条路：从性能差分引理（performance difference lemma，Kakade & Langford, 2002）出发，新旧策略的回报之差可以用**旧策略**的优势函数精确表示：

$$
J(\theta)-J(\theta_{\text{old}})
=
\sum_s
d_\theta(s)
\,
\mathbb{E}_{a\sim\pi_\theta(\cdot|s)}
\left[
A^{\pi_{\theta_{\text{old}}}}(s,a)
\right]
$$

其中 $d_\theta(s)=\sum_t\gamma^t P(s_t=s|\pi_\theta)$ 是新策略的折扣状态访问分布。这是恒等式；把 $d_\theta$ 近似为 $d_{\theta_{\text{old}}}$（也就是同样冻结状态分布），再对动作做重要性采样，得到的就是同一个 $J^{\text{PG}}$。这条路线的好处是能说明代理目标的数值本身对应策略改进量，并且能给出替换 $d_\theta$ 所引入的误差界，从而严格导出信任域约束。细节见 TRPO 论文第 2、3 节。

## 3. 未裁剪目标的梯度

反过来对 $J^{\text{PG}}(\theta)$ 求梯度，等于把上一节的推导倒着走一遍。$\hat A_t$ 视为常数，于是：

$$
\nabla_\theta J^{\text{PG}}(\theta)
=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
\hat A_t
\nabla_\theta r_t(\theta)
\right]
$$

再用上一节的恒等式 $\nabla_\theta r_t(\theta)=r_t(\theta)\nabla_\theta\log\pi_\theta(a_t|s_t)$，把对 ratio 的求导转回到熟悉的 log probability 梯度：

$$
\nabla_\theta J^{\text{PG}}(\theta)
=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
r_t(\theta)\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

将 $r_t(\theta)$ 按定义展开，等价于：

$$
\nabla_\theta J^{\text{PG}}(\theta)
=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

这说明：**$r_t(\theta)$ 是旧策略样本的梯度权重校正项**。如果新策略比旧策略更倾向于产生该动作（$r_t(\theta)>1$），该样本的梯度贡献会被放大；如果新策略相对不倾向于该动作（$r_t(\theta)<1$），该样本的梯度贡献会被缩小。

> $r_t(\theta)$ 把动作分布从 $\pi_{\theta_{\text{old}}}$ 搬到 $\pi_\theta$，因此上式在动作维度等价于 $\mathbb{E}_{s_t\sim d_{\theta_{\text{old}}},\,a_t\sim\pi_\theta}[\hat A_t\nabla_\theta\log\pi_\theta(a_t|s_t)]$。但它**只修正单步动作概率，未修正状态访问分布**，状态仍采自 $d_{\theta_{\text{old}}}$。所以它不等于真正的新策略期望 $\mathbb{E}_{\tau\sim\pi_\theta}[\cdot]$（后者要求 $s_t\sim d_\theta$），只是旧状态分布上的局部代理——**这也是 $J^{\text{PG}}$ 仅在新旧策略接近时才可靠的原因**。

当 $\theta=\theta_{\text{old}}$ 时，$r_t(\theta)=1$，该式退化为普通 Actor-Critic 策略梯度：

$$
\nabla_\theta J^{\text{PG}}(\theta_{\text{old}})
=
\mathbb{E}_{t\sim\pi_{\theta_{\text{old}}}}
\left[
\hat A_t
\nabla_\theta \log \pi_\theta(a_t|s_t)
\right]
$$

> 重要性采样让旧策略采集的数据可以用于估计新策略的目标，但 $r_t(\theta)$ 偏离 1 太远时，估计方差会变大，训练也会变得不稳定。

后文若简写为 $\mathbb{E}_t$，默认表示对旧策略采样得到的 batch 时间步求平均。

---

# 五、PPO-Clip 目标

## 1. 裁剪形式

上一节指出，**当 $r_t(\theta)$ 偏离 1 太远时估计方差变大、训练不稳定，因此需要约束新旧策略的偏离程度**。

TRPO 的做法是显式加上 KL 散度的硬约束，把更新限制在一个信任域内；但这需要求解带约束的优化问题，实现复杂。PPO 用更简单的方式近似达到同样目的：直接对概率比值 $r_t(\theta)$ 做裁剪。

PPO-Clip 将未裁剪目标 $r_t(\theta)\hat A_t$ 改写为：

$$
J^{\text{CLIP}}(\theta)
=
\mathbb{E}_t
\left[
\min
\left(
r_t(\theta)\hat A_t,
\text{clip}(r_t(\theta),1-\epsilon,1+\epsilon)\hat A_t
\right)
\right]
$$

其中：

$$
\text{clip}(r_t,1-\epsilon,1+\epsilon)
=
\begin{cases}
1-\epsilon, & r_t < 1-\epsilon \\
r_t, & 1-\epsilon \le r_t \le 1+\epsilon \\
1+\epsilon, & r_t > 1+\epsilon
\end{cases}
$$

该目标仍然是最大化目标。实际代码中常写成最小化：

$$
L^{\text{CLIP}}(\theta)=-J^{\text{CLIP}}(\theta)
$$

这里**取 $\min$ 而非直接裁剪 $r_t$** 是关键：它让裁剪只在 $r_t(\theta)$ 朝着"使目标继续变好"的方向越界时才生效，而在反方向（纠正已经偏离过头的概率）上不做限制。下面两节按优势符号分别展开，可以看到这一非对称行为的具体来源。

## 2. 正优势时的分段梯度

先考虑 $\hat A_t>0$。此时动作优于平均，策略应提高该动作概率，即希望 $r_t(\theta)$ 增大。

由于 $\hat A_t>0$，有：

$$
\min(r_t\hat A_t,\text{clip}(r_t)\hat A_t)
=
\begin{cases}
r_t\hat A_t, & r_t \le 1+\epsilon \\
(1+\epsilon)\hat A_t, & r_t > 1+\epsilon
\end{cases}
$$

对应梯度为：

$$
\nabla_\theta J_t^{\text{CLIP}}
=
\begin{cases}
\hat A_t \nabla_\theta r_t(\theta), & r_t < 1+\epsilon \\
0, & r_t > 1+\epsilon
\end{cases}
$$

代入 $\nabla_\theta r_t(\theta)=r_t(\theta)\nabla_\theta\log\pi_\theta(a_t|s_t)$：

$$
\nabla_\theta J_t^{\text{CLIP}}
=
\begin{cases}
r_t(\theta)\hat A_t
\nabla_\theta\log\pi_\theta(a_t|s_t), & r_t < 1+\epsilon \\
0, & r_t > 1+\epsilon
\end{cases}
$$

> **直观含义**：当优势为正时，PPO 允许提高该动作概率；但当新策略相对旧策略已经把概率提高到 $1+\epsilon$ 以上时，该样本不再提供继续提高概率的梯度。

## 3. 负优势时的分段梯度

再考虑 $\hat A_t<0$。此时动作差于平均，策略应降低该动作概率，即希望 $r_t(\theta)$ 减小。

由于 $\hat A_t<0$，乘以负数会改变大小关系，因此：

$$
\min(r_t\hat A_t,\text{clip}(r_t)\hat A_t)
=
\begin{cases}
(1-\epsilon)\hat A_t, & r_t < 1-\epsilon \\
r_t\hat A_t, & r_t \ge 1-\epsilon
\end{cases}
$$

对应梯度为：

$$
\nabla_\theta J_t^{\text{CLIP}}
=
\begin{cases}
0, & r_t < 1-\epsilon \\
\hat A_t \nabla_\theta r_t(\theta), & r_t > 1-\epsilon
\end{cases}
$$

也就是：

$$
\nabla_\theta J_t^{\text{CLIP}}
=
\begin{cases}
0, & r_t < 1-\epsilon \\
r_t(\theta)\hat A_t
\nabla_\theta\log\pi_\theta(a_t|s_t), & r_t > 1-\epsilon
\end{cases}
$$

> **直观含义**：当优势为负时，PPO 允许降低该动作概率；但当新策略相对旧策略已经把概率降低到 $1-\epsilon$ 以下时，该样本不再提供继续降低概率的梯度。

## 4. 分段梯度汇总

将两种情况合并，可得到单样本梯度：

| 优势符号 | 比值区间 | 目标项 | 是否有策略梯度 |
|---|---|---|---|
| $\hat A_t>0$ | $r_t \le 1+\epsilon$ | $r_t\hat A_t$ | 有 |
| $\hat A_t>0$ | $r_t > 1+\epsilon$ | $(1+\epsilon)\hat A_t$ | 无 |
| $\hat A_t<0$ | $r_t < 1-\epsilon$ | $(1-\epsilon)\hat A_t$ | 无 |
| $\hat A_t<0$ | $r_t \ge 1-\epsilon$ | $r_t\hat A_t$ | 有 |

因此，PPO-Clip 并不是简单把 $r_t$ 永远限制在 $[1-\epsilon,1+\epsilon]$ 内，而是限制“能带来目标函数继续变好的那一侧更新”：

- $\hat A_t>0$：阻止动作概率被过度提高。
- $\hat A_t<0$：阻止动作概率被过度降低。

如果更新方向是在纠正已经偏离的概率，目标仍然保留梯度。

---

# 六、PPO 中的完整损失

实际训练中，PPO 通常同时优化 Actor、Critic 和熵正则。若写成最大化目标：

$$
J_{\text{PPO}}(\theta,\phi)
=
J^{\text{CLIP}}(\theta)
-
c_v L_{\text{critic}}(\phi)
+
c_e \mathbb{E}_t[H(\pi_\theta(\cdot|s_t))]
$$

若写成最小化损失：

$$
L_{\text{PPO}}(\theta,\phi)
=
-
J^{\text{CLIP}}(\theta)
+
c_v L_{\text{critic}}(\phi)
-
c_e \mathbb{E}_t[H(\pi_\theta(\cdot|s_t))]
$$

其中：

- $J^{\text{CLIP}}$：Actor 的裁剪代理目标。
- $L_{\text{critic}}$：Critic 的价值回归损失。
- $H(\pi_\theta)$：策略熵，用于鼓励探索，避免策略过早塌缩。
- $c_v,c_e$：价值损失和熵正则的权重。

其中策略熵定义为：

$$
H(\pi_\theta(\cdot|s_t))
=
-\sum_{a}\pi_\theta(a|s_t)\log\pi_\theta(a|s_t)
$$

熵越大表示动作分布越分散，最大化熵项可以避免策略过快收敛到确定性分布。

Actor 和 Critic 若共享部分网络参数，则总梯度会在共享参数处相加；若二者完全独立，则 Actor loss 只更新策略网络，Critic loss 只更新价值网络。

## 1. Actor 梯度

最小化形式下，Actor 梯度为：

$$
\nabla_\theta L_{\text{actor}}^{\text{PPO}}
=
-
\nabla_\theta J^{\text{CLIP}}(\theta)
-
c_e \nabla_\theta \mathbb{E}_t[H(\pi_\theta(\cdot|s_t))]
$$

其中 $\nabla_\theta J^{\text{CLIP}}(\theta)$ 按上一节的分段形式计算。

## 2. Critic 梯度

若采用未裁剪价值损失：

$$
L_{\text{critic}}(\phi)
=
\frac{1}{2}\mathbb{E}_t[(V_\phi(s_t)-\hat R_t)^2]
$$

则：

$$
\nabla_\phi L_{\text{critic}}(\phi)
=
\mathbb{E}_t
\left[
(V_\phi(s_t)-\hat R_t)\nabla_\phi V_\phi(s_t)
\right]
$$

部分实现也会使用 value clipping：

$$
V_t^{\text{clip}}
=
V_{\phi_{\text{old}}}(s_t)
+
\text{clip}
\left(
V_\phi(s_t)-V_{\phi_{\text{old}}}(s_t),
-\epsilon_v,
\epsilon_v
\right)
$$

对应损失：

$$
L_{\text{critic}}^{\text{clip}}(\phi)
=
\frac{1}{2}
\mathbb{E}_t
\left[
\max
\left(
(V_\phi(s_t)-\hat R_t)^2,
(V_t^{\text{clip}}-\hat R_t)^2
\right)
\right]
$$

其作用与 Actor clipping 类似：限制价值函数在同一批旧数据上的更新幅度，避免 Critic 在多轮 epoch 中变化过大。

---

# 七、GAE 与 PPO 梯度的关系

PPO 的梯度核心依赖 $\hat A_t$。在实践中，$\hat A_t$ 常由 GAE 给出：

$$
\hat A_t^{GAE}
=
\sum_{l=0}^{T-t-1}
(\gamma\lambda)^l\delta_{t+l}
$$

其中：

$$
\delta_t
=
r_t+\gamma V_{\phi_{\text{old}}}(s_{t+1})
-V_{\phi_{\text{old}}}(s_t)
$$

GAE 计算依赖旧价值函数 $V_{\phi_{\text{old}}}$，因此 PPO 的 Actor 梯度不会对 $\hat A_t$ 继续求导，而是把它当作每个动作的固定权重：

$$
\nabla_\theta J^{\text{CLIP}}
\sim
\hat A_t \nabla_\theta r_t(\theta)
$$

因此可以把 PPO 的 Actor 更新理解为：

- GAE 决定每个动作的优势权重。
- ratio 决定新旧策略在该动作上的概率变化。
- clip 决定该样本是否还允许继续沿当前方向更新。

---

# 八、训练流程

PPO 的一次外层迭代通常包含以下步骤：

1. 使用旧策略 $\pi_{\theta_{\text{old}}}$ 与环境交互，采样轨迹。
2. 缓存每个动作的 $\log \pi_{\theta_{\text{old}}}(a_t|s_t)$、价值 $V_{\phi_{\text{old}}}(s_t)$、奖励和终止标记。
3. 使用奖励和旧价值函数计算 $\hat A_t^{GAE}$ 与 $\hat R_t$。
4. 在同一批数据上进行多轮 minibatch 更新。
5. 每次更新时重新计算 $\log \pi_\theta(a_t|s_t)$，得到 $r_t(\theta)$。
6. 使用 PPO-Clip actor loss、critic loss 和 entropy bonus 更新参数。
7. 当前策略更新完成后，令 $\theta_{\text{old}}\leftarrow\theta$，进入下一轮采样。

**关键约束**：旧 logprob、旧 value、advantage 和 return 在一轮 PPO 更新中通常固定；新 logprob 和新 value 每次前向都会重新计算。

---

# 九、总结

PPO 的梯度推导可以沿着以下链条理解：

$$
\nabla J(\theta)
=
\mathbb{E}
\left[
A_t\nabla\log\pi_\theta(a_t|s_t)
\right]
\quad
\Longrightarrow
\quad
\mathbb{E}
\left[
r_t(\theta)A_t\nabla\log\pi_\theta(a_t|s_t)
\right]
\quad
\Longrightarrow
\quad
\nabla J^{\text{CLIP}}(\theta)
$$

其中：

- **策略梯度**来自 log-derivative trick，将对采样分布的求导转为对 log probability 的求导。
- **优势函数**作为梯度权重，决定某个动作概率应该被提高还是降低。
- **重要性采样**引入 $r_t(\theta)$，使旧策略采样的数据可以用于新策略更新。
- **PPO-Clip**通过分段目标截断“过度变好”的方向，避免新策略相对旧策略变化过大。
- **梯度截断并非双向固定**：正优势只截断过度增大概率，负优势只截断过度降低概率。

从梯度角度看，PPO-Clip 的本质是：在保留策略梯度方向的同时，去掉那些已经超过信任范围、还会继续扩大策略偏移的样本梯度。

---

# 参考资料

- John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Radford, Oleg Klimov. *Proximal Policy Optimization Algorithms*. arXiv:1707.06347, 2017. [https://arxiv.org/abs/1707.06347](https://arxiv.org/abs/1707.06347)
- John Schulman, Philipp Moritz, Sergey Levine, Michael Jordan, Pieter Abbeel. *High-Dimensional Continuous Control Using Generalized Advantage Estimation*. arXiv:1506.02438, 2015. [https://arxiv.org/abs/1506.02438](https://arxiv.org/abs/1506.02438)
- John Schulman, Sergey Levine, Philipp Moritz, Michael I. Jordan, Pieter Abbeel. *Trust Region Policy Optimization*. ICML 2015. [https://proceedings.mlr.press/v37/schulman15.html](https://proceedings.mlr.press/v37/schulman15.html)
- Sham Kakade, John Langford. *Approximately Optimal Approximate Reinforcement Learning*. ICML 2002. [https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/KakadeLangford-icml2002.pdf](https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/KakadeLangford-icml2002.pdf)
- 猛猿. 人人都能看懂的 RL-PPO 理论知识. 知乎专栏. [https://zhuanlan.zhihu.com/p/7461863937](https://zhuanlan.zhihu.com/p/7461863937)
