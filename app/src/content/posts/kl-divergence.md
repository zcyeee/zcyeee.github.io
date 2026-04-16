---
title: "深入理解 KL 散度"
date: "2025-03-21"
tags: ["KL 散度", "信息论"]
category: "数学基础"
excerpt: "以 KL 散度数学定义为基础，深入理解其与交叉熵的关系、非负性的证明，以及正负 KL 散度各自含义与场景。"
---

KL 散度（Kullback-Leibler Divergence）是信息论中衡量两个概率分布差异的核心工具，广泛应用于机器学习、统计推断和信号处理等领域。本文从定义出发，逐步深入其物理含义与几何直觉。

---

# 一、KL 散度定义

给定两个概率分布 $P(x)$ 和 $Q(x)$（通常 $P$ 表示真实分布，$Q$ 表示近似分布），KL 散度定义为：

$$
D_{\text{KL}}(P \| Q) = \sum_{x} P(x) \log \frac{P(x)}{Q(x)}
$$

对于连续型随机变量：

$$
D_{\text{KL}}(P \| Q) = \int_{-\infty}^{+\infty} p(x) \log \frac{p(x)}{q(x)} \, dx
$$

**关键约束**：上述定义要求 $Q(x) > 0$ 当 $P(x) > 0$。若 $P(x) > 0$ 且 $Q(x) = 0$，则 KL 散度为无穷大。

---

# 二、KL 与交叉熵

## 1. 交叉熵定义

交叉熵（Cross Entropy）是信息论中的另一个重要概念：

$$
H(P, Q) = -\sum_{x} P(x) \log Q(x)
$$

## 2. 关系推导

对 KL 散度定义式进行展开：

$$
\begin{aligned}
D_{\text{KL}}(P \| Q) &= \sum_{x} P(x) \log \frac{P(x)}{Q(x)} \\
&= \sum_{x} P(x) \log P(x) - \sum_{x} P(x) \log Q(x) \\
&= -H(P) + H(P, Q)
\end{aligned}
$$

其中 $H(P) = -\sum_{x} P(x) \log P(x)$ 是分布 $P$ 的熵（Entropy）。

**重要结论**：$H(P, Q) = H(P) + D_{\text{KL}}(P \| Q)$

因此，交叉熵等于熵加上 KL 散度。熵是分布 $P$ 自身的内在不确定性，而 KL 散度衡量的是用 $Q$ 逼近 $P$ 带来的额外代价。

## 3. 等价条件

从数学关系式 $H(P, Q) = H(P) + D_{\text{KL}}(P \| Q)$ 出发：

**等价时**：当 $H(P)$ 为常数（即真实分布 $P$ 固定，不随 $Q$ 变化）时，最小化 $H(P,Q)$ 与最小化 $D_{\text{KL}}(P\|Q)$ 等价。
> 此时两者的优化方向完全一致，交叉熵的梯度等于 KL 散度的梯度。在机器学习分类任务中，真实标签分布 $P$ 是固定的 one-hot 编码（或其他固定分布），所以优化模型输出的 $Q$ 时，交叉熵损失和 KL 散度损失是等价的。

$$
\arg\min_Q \, H(P, Q) = \arg\min_Q \, D_{\text{KL}}(P \| Q)
$$

**不等价时**：当 $P$ 本身也随 $Q$ 变化时，$H(P)$ 不再是常数，两者就不再等价。
> 例如，在 VAE 的某些联合学习设定中，目标分布 $P$ 由当前模型参数决定（如依赖当前近似后验或解码分布的构造目标），并与待优化分布 $Q$ 共享参数依赖；此时 $P$ 会随优化过程中的参数更新而联动变化，$H(P)$ 不再是常数，$H(P,Q)$ 与 $D_{\text{KL}}(P\|Q)$ 的最优解可能不同。

简言之，**$P$ 固定时两者等价，$P$ 随 $Q$ 变化时两者不等价**。

---

# 三、KL 的直观解释

## 1. 编码长度

KL 散度可以理解为**用 $Q$ 编码来自分布 $P$ 的样本时，额外需要的编码长度**。

根据 Shannon 信源编码定理，对于来自分布 $P$ 的符号，使用最优编码所需的平均码长约为 $H(P)$ bits。使用基于 $Q$ 的非最优编码，平均码长为 $H(P, Q)$ bits。两者之差即为额外开销：

$$
\underbrace{H(P, Q)}_{\text{使用 } Q \text{ 的编码}} - \underbrace{H(P)}_{\text{最优编码}} = D_{\text{KL}}(P \| Q)
$$

## 2. 相对熵视角

从相对熵的角度理解：KL 散度衡量的是当我们知道真实分布是 $P$ 时，却使用分布 $Q$ 进行建模所损失的信息量。

---

# 四、正向与反向 KL

KL 散度**不是对称的**：$D_{\text{KL}}(P \| Q) \neq D_{\text{KL}}(Q \| P)$。这种不对称性在实际应用中会产生截然不同的效果。

## 1. 正向 KL

正向 KL（Forward KL）在优化时要求 $Q$ 在 $P$ 有支撑的地方处处非零。

$$
D_{\text{KL}}(P \| Q) = \int p(x)\log\frac{p(x)}{q(x)}\,dx
$$

**物理含义**：强迫 $Q$ 覆盖 $P$ 的所有概率质量，即"**零值禁止**"（Zero Avoidance）或"**概率质量覆盖**"（Mass Covering）。

**极端情况**：若 $P(x_0) > 0$ 且 $Q(x_0) = 0$，则 $D_{\text{KL}}(P \| Q) = +\infty$。

**几何图像**：想象 $P$ 是山丘，$Q$ 是试图覆盖它的薄膜。正向 KL 要求薄膜必须覆盖所有山丘所在的位置，即使只是在山谷（$P$ 低概率区域）也要填充。

**典型场景**：监督学习中的极大似然/交叉熵训练，本质上是在让模型分布覆盖真实数据分布，可近似理解为前向 KL 的优化倾向：要求 $Q$ 覆盖 $P$ 的高概率区域。

## 2. 反向 KL

反向 KL（Reverse KL）在优化时要求 $Q$ 只能存在于 $P$ 非零的区域。

$$
D_{\text{KL}}(Q \| P) = \int q(x)\log\frac{q(x)}{p(x)}\,dx
$$

**物理含义**：$Q$ 可以完全忽略 $P$ 的某些高概率区域，即"**峰值追随**"（Mode Seeking），且避免 $P$ 为零处产生概率质量。

**极端情况**：若 $Q(x_0) > 0$ 且 $P(x_0) = 0$，则 $D_{\text{KL}}(Q \| P) = +\infty$。

**几何图像**：薄膜 $Q$ 可以完全贴合 $P$ 的某一个峰值，而不必覆盖 $P$ 的其他区域。

**典型场景**：在策略约束、策略蒸馏、RLHF 等设定中，常见目标是让新策略贴近参考策略并抑制分布外动作，可近似理解为反向 KL 的优化倾向：允许 $Q$ 选择性忽略 $P$ 的某些低概率区域（如罕见动作）。

## 3. 综合对比

以双峰分布 $P$ 和单峰分布 $Q$ 为例：

| 目标 | 拟合行为 | 常见风险 | 常见场景 |
|------|----------|----------|----------|
| 最小化 $D_{\text{KL}}(P \| Q)$ | $Q$ 倾向覆盖两个峰（mass covering） | 可能在低概率区域分配过多质量 | 监督学习中的 MLE/交叉熵训练 |
| 最小化 $D_{\text{KL}}(Q \| P)$ | $Q$ 倾向只贴合一个主峰（mode seeking） | 可能遗漏次峰（模式坍塌） | 变分推断、策略约束/蒸馏 |


## 4、MLE 与 FKL

设真实数据分布为 $P_{\text{data}}$，模型分布为 $Q_\theta$。最大似然估计的总体目标可写为：

$$
\max_\theta \mathbb{E}_{x\sim P_{\text{data}}}[\log Q_\theta(x)]
$$

将最大化对数似然改写为最小化形式，可得它等价于最小化交叉熵 $H(P_{\text{data}}, Q_\theta)$。又因为 $H(P_{\text{data}})$ 与参数 $\theta$ 无关，所以进一步等价于最小化前向 KL：

$$
\arg\max_\theta \mathbb{E}_{x\sim P_{\text{data}}}[\log Q_\theta(x)]
= \arg\min_\theta H(P_{\text{data}}, Q_\theta)
= \arg\min_\theta D_{\text{KL}}(P_{\text{data}} \| Q_\theta)
$$

这说明：在标准密度估计与监督学习设定中，MLE 的优化方向就是让模型分布去逼近真实分布，即最小化 $D_{\text{KL}}(P_{\text{data}} \| Q_\theta)$。

---

# 五、 如何选择 FKL 和 RKL

一个实用的判断方式是：**看目标分布是否可采样、是否可计算样本概率（允许未归一化）**。

先看两个目标的形式：

$$
D_{\text{KL}}(P\|Q)=\mathbb{E}_{x\sim P}\left[\log P(x)-\log Q(x)\right]
$$

$$
D_{\text{KL}}(Q\|P)=\mathbb{E}_{x\sim Q}\left[\log Q(x)-\log P(x)\right]
$$

- 对于 **FKL**：期望是对 $x\sim P$ 取的，所以必须能从目标分布 $P$ 采样；而 $Q$ 是我们正在训练的模型，$\log Q(x)$ 通常可计算。  
- 对于 **RKL**：期望是对 $x\sim Q$ 取的，不再要求从 $P$ 采样；但必须能计算 $\log P(x)$（至少到一个与参数无关的常数，即未归一化 log-prob 也可以）。

因此可以得到一个很直接的结论：

- **能从目标分布采样** 是使用 FKL 的关键前提。  
- **能评估样本在目标分布下的概率** 是使用 RKL 的关键前提。

进一步看常见的四类场景：

## 情况一：能采样，但不能算目标概率

这是最常见的一类，比如监督学习中的真实数据分布、很多生成建模任务的数据分布。

- 能拿到大量样本（图片、文本、语音等），等价于从某个真实分布采样。  
- 但对某个具体样本，通常无法给出其“真实分布概率”的精确值。  

这时更自然的是 FKL（在监督学习里等价于交叉熵/MLE 训练）。从效果上看，FKL 倾向于覆盖更多模式（mass covering），通常有助于保持生成多样性。

## 情况二：能算目标概率，但难以直接采样

这在概率建模里也非常常见，比如贝叶斯后验、能量模型、变分推断中的一些目标分布。

- 可以写出（未归一化的）目标密度：$P(x) \propto \tilde{P}(x)$（其中 $\tilde{P}$ 为未归一化形式）；  
- 但直接从该分布高效采样很难。  

这时 RKL 往往可行，因为优化时只需要 $\log P(x)$ 的相对量；归一化常数若与模型参数无关，在求梯度时会消掉。

## 情况三：既不能采样，也不能算目标概率

这种情况通常无法直接套用标准 FKL/RKL 目标，需要引入额外假设、辅助模型或替代训练策略（例如间接监督、对比学习、代理目标等）。

## 情况四：既能采样，也能算目标概率

这是“信息最完整”的理想场景，FKL 和 RKL 都可以用。典型例子是知识蒸馏：当教师模型可控（可采样、可评估概率）时，学生模型既可做分布覆盖式拟合，也可做峰值追随式拟合。

此时选择重点不再是“能不能做”，而是“想要什么行为”：

- 想覆盖更多模式、减少漏模态风险：更偏向 FKL。  
- 想集中到高概率主峰、强调保守贴合：更偏向 RKL。  

实践中也可以结合具体任务，采用混合目标或分阶段优化。

---

# 六、KL 基本性质

## 1. 非负性

$$
D_{\text{KL}}(P \| Q) \geq 0
$$

由 Jensen 不等式：对凸函数 $\phi$（$\phi''(x)\ge 0$）和随机变量 $X$，有 $\mathbb{E}[\phi(X)] \geq \phi(\mathbb{E}[X])$。

取凸函数 $\phi(x) = -\log x$，对 $X = \frac{Q(x)}{P(x)}$ 施以 Jensen 不等式：

$$
\begin{aligned}
D_{\text{KL}}(P \| Q) &= \sum_{x} P(x) \log \frac{P(x)}{Q(x)} \\
&= -\mathbb{E}_{x \sim P}\left[\log \frac{Q(x)}{P(x)}\right] \\
&\geq -\log \mathbb{E}_{x \sim P}\left[\frac{Q(x)}{P(x)}\right] \\
&= -\log \sum_{x} Q(x) = -\log 1 = 0
\end{aligned}
$$

**等号成立条件**：当且仅当 $P(x) = Q(x)$ 对所有 $x$ 成立。

## 2. 非对称性

$$
D_{\text{KL}}(P \| Q) \neq D_{\text{KL}}(Q \| P)
$$


---

# 七、代码实现

## 1. NumPy 实现

以下是用 Python 手动实现 KL 散度的示例：

```python
import numpy as np

def kl_divergence(p, q, epsilon=1e-10):
    p = np.array(p, dtype=np.float64)
    q = np.array(q, dtype=np.float64)
    
    p = p / np.sum(p)
    q = q / np.sum(q)
    
    q = np.clip(q, epsilon, 1.0)  # epsilon: 防止 log(0) 的小常数
    p = np.clip(p, epsilon, 1.0)
    
    return np.sum(p * np.log(p / q))

p = np.array([0.3, 0.7])
q = np.array([0.5, 0.5])

print(f"D_KL(P||Q) = {kl_divergence(p, q):.4f}")
print(f"H(P) = {-np.sum(p * np.log(p)):.4f}")
print(f"H(P,Q) = {-np.sum(p * np.log(q)):.4f}")
```

## 2. PyTorch 实现

若输入是 logits（未归一化分数），可直接用 `log_softmax` 计算 KL：

```python
import torch

def KL(p_logits, q_logits):
    p_log_probs = torch.log_softmax(p_logits, dim=-1)
    q_log_probs = torch.log_softmax(q_logits, dim=-1)

    p_probs = torch.exp(p_log_probs)
    kl_div = torch.sum(p_probs * (p_log_probs - q_log_probs), dim=-1)

    return kl_div
```

---

# 参考资料

1. [KL 散度：Forward 与 Reverse](https://zhuanlan.zhihu.com/p/2024947723019843192)
2. [RL 中的 KL 估计器选型：从数值无偏到梯度正确](https://xihuai18.github.io/reinforcement-learning/2025/12/01/kl-estimators-zh.html)