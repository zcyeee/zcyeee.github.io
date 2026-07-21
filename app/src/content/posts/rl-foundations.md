---
title: "强化学习基础：从 MDP 到 LLM RL"
date: "2025-08-19"
tags: ["强化学习", "MDP", "价值函数", "Actor-Critic", "LLM RL"]
category: "强化学习"
excerpt: "MDP、价值函数与策略优化构成强化学习的基本框架，value-based、policy-based、actor-critic 三类方法则对应不同的求解思路。"
---

强化学习（Reinforcement Learning）研究智能体如何通过与环境交互、最大化长期累积回报来学习决策策略。不同于普通优化问题，RL 的奖励往往延迟且稀疏，且当前动作会影响后续状态分布。

本文首先介绍马尔可夫决策过程（MDP）和价值函数的基本形式，并进一步梳理 value-based、policy-based、actor-critic 三类方法，最后从宏观层面理解 LLM 后训练中的 RL 方法。

---

# 一、马尔可夫决策过程

## 1. 基本定义

马尔可夫决策过程（Markov Decision Process, MDP）是强化学习中最常用的问题建模方式。一个 MDP 通常由五元组表示：

$$
\mathcal{M} = (\mathcal{S}, \mathcal{A}, P, R, \gamma)
$$

其中：

- $\mathcal{S}$：状态空间，表示智能体可能观察到的环境状态；
- $\mathcal{A}$：动作空间，表示智能体可执行的动作集合；
- $P(s'|s,a)$：状态转移概率，表示在状态 $s$ 执行动作 $a$ 后转移到 $s'$ 的概率；
- $R(s,a)$ 或 $R(s,a,s')$：奖励函数，表示执行动作后得到的即时反馈；
- $\gamma \in [0,1]$：折扣因子，用于控制未来奖励的重要程度。

一次交互轨迹可写为：

$$
\tau = (s_0,a_0,r_0,s_1,a_1,r_1,\dots)
$$

智能体在每个状态下根据策略选择动作：

$$
a_t \sim \pi(\cdot|s_t)
$$

环境根据状态转移概率返回下一个状态和奖励：

$$
s_{t+1} \sim P(\cdot|s_t,a_t), \qquad r_t = R(s_t,a_t)
$$

## 2. 马尔可夫性质

MDP 的核心假设是**马尔可夫性质**：未来状态只依赖当前状态和当前动作，而不依赖更早的历史。

$$
P(s_{t+1}|s_t,a_t,s_{t-1},a_{t-1},\dots)
= P(s_{t+1}|s_t,a_t)
$$

这意味着当前状态 $s_t$ 已经包含了做决策所需的全部历史信息。

**直观含义**：如果状态定义足够完整，智能体不需要记住完整过去，只需要基于当前状态做决策。

在实际任务中，状态往往不一定完全满足马尔可夫性质。例如游戏画面、机器人传感器、文本上下文都可能只提供部分信息。这时问题更接近部分可观测 MDP（POMDP），通常需要通过历史窗口、循环网络或上下文表示来弥补信息缺失。

## 3. 优化目标

强化学习的目标不是最大化单步奖励，而是最大化从当前时刻开始的折扣累积回报：

$$
G_t = \sum_{k=0}^{\infty} \gamma^k r_{t+k}
$$

其中 $\gamma$ 控制智能体对未来奖励的关注程度：

- $\gamma = 0$：只关心当前即时奖励；
- $\gamma \rightarrow 1$：更重视长期收益；
- $\gamma < 1$：保证无限时域下累积回报在一定条件下收敛。

给定策略 $\pi$，强化学习希望找到最优策略：

$$
\pi^* = \arg\max_\pi \mathbb{E}_{\tau\sim\pi}[G_0]
$$

**核心问题**：智能体的动作会改变后续状态分布，因此优化目标中的数据分布本身也依赖策略。这是 RL 相比普通监督学习更难的根本原因之一。

## 4. 探索与利用

由于训练数据由智能体自己的动作产生，RL 始终面临**探索与利用（exploration vs exploitation）**的矛盾：

- **利用（exploitation）**：选择当前估计收益最高的动作，以获取即时回报；
- **探索（exploration）**：尝试尚未充分评估的动作，以发现可能更优的策略。

如果只利用，智能体可能过早收敛到次优策略；如果只探索，又无法把已学到的知识转化为收益。常见的折中方式包括 $\epsilon$-greedy（以小概率随机选择动作）、softmax/Boltzmann 采样，以及在策略中显式保留随机性（随机策略本身就带有探索能力）。

**与监督学习的区别**：监督学习的数据分布是固定的，而 RL 的数据分布由策略决定，探索不足会导致某些区域的数据始终采集不到，从而无法纠正对应的价值或策略估计。

---

# 二、价值函数

## 1. 状态价值函数

状态价值函数（State Value Function）衡量在状态 $s$ 下遵循策略 $\pi$ 能获得的期望长期回报：

$$
V^\pi(s)
= \mathbb{E}_\pi\left[
\sum_{k=0}^{\infty}\gamma^k r_{t+k}
\mid s_t=s
\right]
$$

**直观含义**：$V^\pi(s)$ 表示当前状态本身有多好。

例如在棋类游戏中，一个局面接近胜利，则该状态的价值较高；一个局面接近失败，则价值较低。

## 2. 动作价值函数

动作价值函数（Action Value Function）衡量在状态 $s$ 下先执行动作 $a$，之后遵循策略 $\pi$ 能获得的期望长期回报：

$$
Q^\pi(s,a)
= \mathbb{E}_\pi\left[
\sum_{k=0}^{\infty}\gamma^k r_{t+k}
\mid s_t=s,a_t=a
\right]
$$

**直观含义**：$Q^\pi(s,a)$ 表示在当前状态下选择某个动作有多好。

状态价值和动作价值之间的关系为：

$$
V^\pi(s) = \mathbb{E}_{a\sim\pi(\cdot|s)}[Q^\pi(s,a)]
$$

如果策略是离散动作上的随机策略，则可写为：

$$
V^\pi(s)=\sum_a \pi(a|s)Q^\pi(s,a)
$$

## 3. 贝尔曼方程

价值函数满足递归结构。对状态价值函数，有：

$$
V^\pi(s)
= \mathbb{E}_{a\sim\pi(\cdot|s),\,s'\sim P(\cdot|s,a)}
\left[
R(s,a)+\gamma V^\pi(s')
\right]
$$

对动作价值函数，有：

$$
Q^\pi(s,a)
= \mathbb{E}_{s'\sim P(\cdot|s,a)}
\left[
R(s,a)+\gamma \mathbb{E}_{a'\sim\pi(\cdot|s')}Q^\pi(s',a')
\right]
$$

**关键结论**：价值函数把长期回报拆成了“当前奖励 + 下一状态价值”。这使得 RL 可以通过递推、自举和动态规划思想估计长期收益。

## 4. 最优价值函数

最优状态价值函数定义为所有策略中能达到的最大价值：

$$
V^*(s)=\max_\pi V^\pi(s)
$$

最优动作价值函数定义为：

$$
Q^*(s,a)=\max_\pi Q^\pi(s,a)
$$

它满足最优贝尔曼方程：

$$
Q^*(s,a)
= \mathbb{E}_{s'\sim P(\cdot|s,a)}
\left[
R(s,a)+\gamma \max_{a'}Q^*(s',a')
\right]
$$

如果已经知道 $Q^*(s,a)$，最优策略可以直接通过贪心选择得到：

$$
\pi^*(s)=\arg\max_a Q^*(s,a)
$$

这也是 value-based 方法的基本出发点。

---

# 三、Value-Based 方法

## 1. 核心思想

Value-based 方法不直接学习策略，而是学习价值函数，尤其是动作价值函数 $Q(s,a)$。学到 $Q$ 后，再通过贪心或近似贪心方式选择动作：

$$
a_t = \arg\max_a Q(s_t,a)
$$

典型代表包括 Q-learning、DQN 及其改进方法。

## 2. Q-learning

Q-learning 使用时序差分目标更新动作价值函数：

$$
Q(s_t,a_t)
\leftarrow
Q(s_t,a_t)
+ \alpha\left[
r_t+\gamma\max_{a'}Q(s_{t+1},a')-Q(s_t,a_t)
\right]
$$

其中括号内是 TD Error：

$$
\delta_t = r_t+\gamma\max_{a'}Q(s_{t+1},a')-Q(s_t,a_t)
$$

**直观含义**：如果实际得到的“当前奖励 + 下一状态最佳价值”高于当前估计，就提高 $Q(s_t,a_t)$；反之则降低。

## 3. 探索策略：ε-greedy

Q-learning 更新时使用 $\max_{a'}Q$，但在与环境交互、采集数据时仍需探索，否则某些动作的价值永远得不到修正。最常用的做法是 $\epsilon$-greedy：

$$
a_t=
\begin{cases}
\arg\max_a Q(s_t,a), & \text{以概率 } 1-\epsilon\\
\text{随机动作}, & \text{以概率 } \epsilon
\end{cases}
$$

实际训练中 $\epsilon$ 通常从较大值逐渐衰减：早期多探索，后期多利用。

## 4. On-Policy 与 Off-Policy

按照“采集数据的行为策略”与“被优化的目标策略”是否一致，RL 算法可分为两类：

- **On-policy**：采集数据的行为策略与被更新的目标策略相同，例如 SARSA、REINFORCE、PPO；
- **Off-policy**：行为策略与目标策略可以不同，从而能复用历史经验或其他策略产生的数据，例如 Q-learning、DQN。

Q-learning 是典型的 off-policy 方法：采集数据时可用 $\epsilon$-greedy 探索，更新目标却用 $\max_{a'}Q$ 这一贪心策略。**off-policy 的好处是样本效率高（可配合经验回放复用数据），代价是训练稳定性更难保证。**

## 5. 从 Q-learning 到 DQN

当状态空间很大（如图像输入）时，无法再用表格存储 $Q(s,a)$。DQN 用神经网络 $Q_\theta(s,a)$ 近似动作价值，并引入两项关键技术稳定训练：

- **经验回放（experience replay）**：把交互产生的 $(s,a,r,s')$ 存入缓冲区，训练时随机采样，打破样本间的时间相关性，同时提高数据利用率；
- **目标网络（target network）**：用一个更新较慢的 $Q_{\theta^-}$ 计算 TD 目标 $r+\gamma\max_{a'}Q_{\theta^-}(s',a')$，避免目标值随参数频繁抖动而导致训练发散。

后续的 Double DQN、Dueling DQN、Prioritized Replay 等都是在此基础上的改进。

## 6. 特点

Value-based 方法的优势：

- **样本效率较高**：很多方法可以离策略学习，复用历史经验；
- **目标直观**：学习每个动作的长期价值，再选择价值最高的动作；
- **适合离散动作空间**：当动作数量有限时，$\max_a Q(s,a)$ 容易计算。

主要局限：

- **难处理大规模连续动作空间**：需要对动作空间做最大化，计算困难；
- **策略表达受限**：贪心策略天然偏确定性，难以直接表达复杂随机策略；
- **高维动作空间代价大**：如果动作数量极大，枚举所有动作不可行。

**典型场景**：Atari 游戏、离散控制任务、动作空间较小且可枚举的问题。

---

# 四、Policy-Based 方法

## 1. 核心思想

Policy-based 方法直接参数化策略：

$$
\pi_\theta(a|s)
$$

并通过优化参数 $\theta$ 最大化期望回报：

$$
J(\theta)=\mathbb{E}_{\tau\sim\pi_\theta}[G_0]
$$

与 value-based 方法不同，policy-based 方法不需要先学习完整的 $Q(s,a)$ 再做贪心选择，而是直接学习“在什么状态下采取什么动作”。

## 2. 策略梯度

策略梯度定理给出了目标函数对策略参数的梯度形式：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}_{s\sim d^{\pi_\theta},\,a\sim\pi_\theta}
\left[
\nabla_\theta \log \pi_\theta(a|s) Q^{\pi_\theta}(s,a)
\right]
$$

其中 $d^{\pi_\theta}$ 表示策略诱导的状态访问分布。

**直观含义**：如果某个动作带来的长期回报高，就增加该动作在对应状态下的概率；如果回报低，就降低其概率。

实际中通常会使用回报估计 $G_t$ 或优势函数 $A_t$ 替代 $Q^\pi(s,a)$：

$$
\nabla_\theta J(\theta)
\approx
\mathbb{E}
\left[
\nabla_\theta \log \pi_\theta(a_t|s_t) A_t
\right]
$$

## 3. REINFORCE

REINFORCE 是最基础的策略梯度算法，直接用蒙特卡洛回报 $G_t$ 作为对 $Q^\pi(s_t,a_t)$ 的无偏估计：

$$
\theta \leftarrow \theta + \alpha\, G_t\, \nabla_\theta\log\pi_\theta(a_t|s_t)
$$

它完全 on-policy：每轮用当前策略采样若干完整轨迹，按上式更新后再重新采样。优点是实现简单、估计无偏；缺点是 $G_t$ 来自整条轨迹的随机回报，**方差很大**，导致收敛慢、训练不稳定。

## 4. Baseline 与方差降低

降低方差的经典技巧是从回报中减去一个只依赖状态的**基线（baseline）** $b(s)$：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}
\left[
\nabla_\theta \log \pi_\theta(a_t|s_t)\,\big(G_t-b(s_t)\big)
\right]
$$

由于 $\mathbb{E}_{a\sim\pi}[\nabla_\theta\log\pi_\theta(a|s)]=0$，**减去任意只依赖状态的 $b(s)$ 都不改变梯度的期望（仍然无偏）**，却能显著降低方差。最常用的基线就是状态价值 $V^\pi(s)$，此时 $G_t-V^\pi(s_t)$ 正是对优势函数 $A^\pi(s_t,a_t)$ 的估计——这也正是下一章 Actor-Critic 的出发点。

## 5. 特点

Policy-based 方法的优势：

- **适合连续动作空间**：策略可以直接输出连续分布参数；
- **可以学习随机策略**：适合存在多种合理动作或需要探索的任务；
- **目标与策略直接对齐**：优化对象就是最终执行的策略。

主要局限：

- **方差较大**：轨迹回报噪声会直接影响梯度估计；
- **样本效率较低**：很多策略梯度方法依赖 on-policy 数据；
- **训练稳定性要求高**：策略更新过大可能导致性能突然下降。

**典型场景**：连续控制、机器人控制、需要随机策略或高维策略分布的问题。

---

# 五、Actor-Critic 方法

## 1. 基本结构

Actor-Critic 方法结合了 policy-based 和 value-based 的思想：

- **Actor**：策略网络，负责输出动作分布 $\pi_\theta(a|s)$；
- **Critic**：价值网络，负责估计 $V_\phi(s)$ 或 $Q_\phi(s,a)$。

Actor 根据 Critic 提供的价值信号更新策略，Critic 根据环境反馈学习价值函数。

## 2. 优势函数

Actor-Critic 中常使用优势函数：

$$
A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)
$$

**直观含义**：优势函数衡量某个动作相比当前策略平均水平好多少。

- $A^\pi(s,a)>0$：该动作优于平均水平，应提高概率；
- $A^\pi(s,a)<0$：该动作低于平均水平，应降低概率。

策略梯度可以写为：

$$
\nabla_\theta J(\theta)
=
\mathbb{E}
\left[
\nabla_\theta \log \pi_\theta(a_t|s_t) A^\pi(s_t,a_t)
\right]
$$

相比直接使用 $Q^\pi(s,a)$，使用优势函数通常可以降低梯度方差。这正是 Policy-Based 一章中 baseline 思想的体现：以 $V^\pi(s)$ 作为基线，$A^\pi=Q^\pi-V^\pi$ 既保持无偏，又削减了方差。

## 3. TD Error 作为优势估计

如果 Critic 估计状态价值 $V_\phi(s)$，则单步 TD Error 为：

$$
\delta_t = r_t + \gamma V_\phi(s_{t+1}) - V_\phi(s_t)
$$

当 $V_\phi$ 足够接近真实价值函数时，$\delta_t$ 可以作为优势函数的近似估计。

更一般地，可以把多步 TD Error 加权累积，得到 GAE：

$$
A_t^{GAE}
=
\sum_{l=0}^{T-t-1}(\gamma\lambda)^l\delta_{t+l}
$$

这正是 PPO 等现代策略优化算法中常用的优势估计方式。

## 4. 综合对比

| 方法 | 学习对象 | 动作选择 | 典型方法 | 优势 | 局限 |
|------|----------|----------|----------|------|------|
| Value-based | $Q(s,a)$ | $\arg\max_a Q(s,a)$ | Q-learning、DQN | 样本效率高，适合离散动作 | 难处理连续或超大动作空间 |
| Policy-based | $\pi_\theta(a\mid s)$ | 从策略分布采样 | REINFORCE、策略梯度 | 可直接优化随机策略 | 方差大，样本效率低 |
| Actor-Critic | 策略 + 价值函数 | Actor 输出动作 | A2C、A3C、PPO | 兼顾表达能力与稳定性 | 实现复杂，对价值估计敏感 |

**关键结论**：Actor-Critic 的核心价值在于用 Critic 降低策略梯度方差，同时保留 Actor 直接学习策略分布的能力。

---

# 六、LLM 中的强化学习视角

## 1. MDP 映射

在语言模型后训练中，可以把文本生成过程近似看成一个序列决策问题：

| RL 概念 | LLM 对应 |
|------|----------|
| 状态 $s_t$ | prompt 加上当前已生成 token 前缀 |
| 动作 $a_t$ | 下一个 token |
| 策略 $\pi_\theta(a_t\mid s_t)$ | 当前语言模型的 next-token 分布 |
| 轨迹 $\tau$ | 一段完整回复 |
| 奖励 $R$ | 奖励模型、规则奖励、人类偏好或任务指标 |
| 参考策略 $\pi_{\text{ref}}$ | SFT 模型或冻结基座模型 |

一次回复可以看作从左到右逐 token 采样：

$$
y_t \sim \pi_\theta(\cdot|x,y_{<t})
$$

完整回复概率为：

$$
\pi_\theta(y|x)=\prod_{t=1}^{T}\pi_\theta(y_t|x,y_{<t})
$$

**核心问题**：LLM 的动作空间是整个词表，轨迹长度可能很长，而奖励通常只在完整回复结束后给出。这使得 LLM RL 具有高维动作、长时序信用分配和稀疏奖励等困难。

## 2. Value-Based 的局限性

从形式上看，也可以定义 token 级动作价值：

$$
Q(x,y_{<t},y_t)
$$

但在 LLM 中直接做 value-based 学习并不自然：

- **动作空间极大**：每一步动作是词表中的 token，通常有数万到数十万种选择；
- **动作语义强依赖上下文**：同一个 token 在不同上下文中的价值差异很大；
- **奖励多为序列级**：奖励模型通常对完整回复打分，难以直接得到每个 token 的准确 $Q$ 值；
- **生成质量依赖分布形状**：只做 $\arg\max Q$ 容易破坏语言模型原有的多样性和流畅性。

因此，LLM 后训练中更常见的是直接优化策略分布，并用 KL 约束限制模型不要偏离参考模型太远。

## 3. RLHF 的基本流程

经典 RLHF 通常包含三个阶段：

1. **SFT**：用高质量指令数据监督微调模型，得到具备基础指令跟随能力的策略；
2. **Reward Model**：用人类偏好数据训练奖励模型，学习判断回复质量；
3. **RL 优化**：以奖励模型分数为优化目标，同时加入 KL 约束，继续更新策略模型。

RL 阶段的目标可抽象为：

$$
\max_\theta\ 
\mathbb{E}_{y\sim\pi_\theta(\cdot|x)}
\left[
R(x,y)
\right]
-
\beta D_{\text{KL}}
\left(
\pi_\theta(\cdot|x)\|
\pi_{\text{ref}}(\cdot|x)
\right)
$$

其中：

- $R(x,y)$：奖励模型或规则奖励给出的分数；
- $\pi_{\text{ref}}$：冻结参考模型，通常来自 SFT 模型；
- $\beta$：KL 惩罚强度，用于控制新策略偏离参考策略的程度。

**直观含义**：模型既要提高高奖励回复的概率，又不能为了追求奖励而跑到参考模型极低概率的区域。

**两种等价的 KL 实现位置**：上式把 KL 写成目标函数中**独立的一项**，便于理解；但工程实现中，PPO 通常把 KL 惩罚**折算进逐 token 奖励**——只在序列末尾给出奖励模型分数，并在每一步额外减去一项 KL 惩罚：

$$
r_t=
\begin{cases}
-\beta\log\dfrac{\pi_\theta(y_t\mid x,y_{<t})}{\pi_{\text{ref}}(y_t\mid x,y_{<t})}, & t<T\\
R(x,y)-\beta\log\dfrac{\pi_\theta(y_T\mid x,y_{<T})}{\pi_{\text{ref}}(y_T\mid x,y_{<T})}, & t=T
\end{cases}
$$

这样 KL 约束就转化为每个 token 的即时奖励，直接进入后续的优势估计。两种写法优化目标一致，只是一个写在序列级、一个落到 token 级，初次对照代码时容易困惑。

## 4. PPO 与 Actor-Critic

PPO 是 LLM RLHF 中经典使用的策略优化方法，本质上属于 Actor-Critic 框架：

- **Actor**：当前待训练的语言模型 $\pi_\theta$；
- **Critic**：价值模型 $V_\phi(x,y_{<t})$，估计当前前缀状态的未来回报；
- **Reward**：奖励模型分数、规则奖励以及 KL 惩罚组合后的 token 或序列级反馈；
- **Advantage**：通常由 TD Error 或 GAE 估计得到。

PPO 使用概率比值约束新旧策略的变化：

$$
r_t(\theta)=
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\text{old}}}(a_t|s_t)}
$$

这个比值本质来自**重要性采样**：策略梯度本是 on-policy 的，但为了用同一批采样数据做多次更新，PPO 用旧策略 $\pi_{\theta_{\text{old}}}$ 采集数据，再用比值 $r_t(\theta)$ 把期望校正到新策略 $\pi_\theta$ 上。当比值偏离 1 太多时，重要性采样的方差会急剧增大，这也是需要 clip 的根本原因（完整推导见 [PPO 梯度推导](/blog/ppo-gradient)）。

并通过 clip 机制限制单次更新幅度，避免策略突然偏移：

$$
\mathcal{L}^{CLIP}(\theta)
=
\mathbb{E}
\left[
\min
\left(
r_t(\theta)A_t,\ 
\text{clip}(r_t(\theta),1-\epsilon,1+\epsilon)A_t
\right)
\right]
$$

**关键结论**：PPO 在 LLM 中的作用不是重新定义语言建模目标，而是在奖励信号驱动下微调策略，同时通过 KL 和 clip 控制更新幅度。

## 5. GRPO 与去 Critic 化思路

在 LLM 场景中，训练 Critic 往往代价较高，并且价值估计不稳定。GRPO（Group Relative Policy Optimization）等方法尝试弱化或移除显式 Critic，通过同一 prompt 下多条采样回复的相对分数构造优势：

$$
A_i =
\frac{R_i-\text{mean}(R_1,\dots,R_G)}
{\text{std}(R_1,\dots,R_G)}
$$

其中 $G$ 表示同一 prompt 采样出的回复数量。

**直观含义**：不再要求模型准确估计某个前缀状态的绝对价值，而是在同组候选回复之间比较谁更好。

需要注意，$A_i$ 是**序列级**的标量优势：同一条回复内的所有 token 共享同一个 $A_i$（broadcast 到各 token 位置），再代入 PPO 式的 clip 目标进行更新。这样既省去了 Critic，又复用了 PPO 的稳定化机制。

这种思路适合数学推理、代码生成、可验证任务等场景，因为奖励可以由规则、单元测试或答案验证器给出。

## 6. DPO 类方法的位置

DPO（Direct Preference Optimization）等偏好优化方法通常不显式采样环境轨迹，也不训练单独的奖励模型和 Critic，而是直接从偏好数据中构造分类式目标，使被偏好的回答相对不被偏好的回答概率更高。

从严格意义上说，DPO 不完全等同于传统 on-policy RL；但从目标效果看，它仍然是在偏好信号下调整策略分布，并隐式包含了相对参考模型的约束。

因此可以粗略理解为：

- PPO/GRPO：更接近在线或采样驱动的策略优化；
- DPO/IPO/KTO：更接近离线偏好数据上的直接策略优化；
- SFT：模仿数据分布，不显式区分偏好强弱；
- Reward Model + RL：先学习偏好评分，再用该评分驱动策略改进。

