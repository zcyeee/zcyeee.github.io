---
title: "SFT 与 RL 中的 KL 散度"
date: "2025-04-27"
tags: ["KL 散度", "SFT", "RLHF"]
category: "大语言模型"
excerpt: "梳理 SFT 与 RL 中 KL 散度方向的差异，说明正向 KL 的模式覆盖倾向，以及反向 KL 在奖励优化和策略约束中的作用。"
---

在模型后训练和任务适配中，SFT 与 RL 是两类常见方法：前者让模型模仿给定数据，后者让模型根据奖励或偏好信号继续优化。它们既可以用于大语言模型对齐，也可以用于更一般的策略学习、能力迁移和目标任务适配。

本文主要以语言模型后训练为例，讨论两者和 KL 散度之间的关系：**SFT 更接近正向 KL，RL 中的 KL 约束则通常为反向 KL**。

---

# 一、SFT 与 RL 目标差异

| 阶段 | 主要目标 | KL 类型 | 公式形式 | 行为倾向 |
|------|----------|---------|----------|----------|
| SFT | 模仿数据分布 | 正向 KL | $D_{\text{KL}}(P_{\text{data}}\|P_\theta)$ | 模式覆盖，学习数据中出现过的行为 |
| RLHF/RLAIF | 最大化奖励，并约束偏离参考模型 | 反向 KL | $D_{\text{KL}}(P_\theta\|P_{\text{ref}})$ | 在参考模型附近追求高奖励输出 |

其中：

- $P_{\text{data}}$ 表示监督微调数据所诱导的目标分布；
- $P_\theta$ 表示当前模型分布；
- $P_{\text{ref}}$ 通常表示 SFT 后冻结的参考模型分布。

---

# 二、SFT 与正向 KL

## 1. SFT 的交叉熵目标

SFT 通常使用 next-token prediction 的交叉熵损失。以一个 prompt $x$ 和回复 $y$ 为例，可写为：

$$
\mathcal{L}_{\text{SFT}}
= -\mathbb{E}_{(x,y)\sim P_{\text{data}}}\left[\log P_\theta(y|x)\right]
$$

对固定的数据分布 $P_{\text{data}}$，该目标等价于最小化交叉熵：

$$
H(P_{\text{data}},P_\theta)
= -\mathbb{E}_{y\sim P_{\text{data}}}\left[\log P_\theta(y|x)\right]
$$

又因为

$$
H(P_{\text{data}},P_\theta)
= H(P_{\text{data}})
+ D_{\text{KL}}(P_{\text{data}}\|P_\theta)
$$

当 $P_{\text{data}}$ 固定时，$H(P_{\text{data}})$ 与模型参数 $\theta$ 无关，因此：

$$
\arg\min_\theta H(P_{\text{data}},P_\theta)
= \arg\min_\theta D_{\text{KL}}(P_{\text{data}}\|P_\theta)
$$

这就是“**SFT 对应正向 KL**”的来源。

## 2. 正向 KL 的行为倾向

正向 KL 的形式为：

$$
D_{\text{KL}}(P_{\text{data}}\|P_\theta)
= \mathbb{E}_{y\sim P_{\text{data}}}
\left[\log\frac{P_{\text{data}}(y|x)}{P_\theta(y|x)}\right]
$$

期望来自数据分布 $P_{\text{data}}$。这意味着：只要某类回复在数据中出现，模型就会被要求提高它的概率；如果 $P_{\text{data}}(y|x)>0$ 但 $P_\theta(y|x)$ 很小，损失会很大。

因此，正向 KL 通常体现出 **mode covering** 的倾向：

- 对数据分布覆盖到的行为保持敏感；
- 尽量避免遗漏训练数据中的模式；
- 当同一类问题存在多种有效回答方式时，倾向于把概率质量分配给多个模式。

这也是 SFT 适合作为对齐第一阶段的原因：它能把模型拉向人类示范数据所覆盖的行为区域，使模型获得基本的指令跟随能力、格式习惯和回答风格。

## 3. SFT 的局限

普通 SFT 只知道“这个样本应该被模仿”，并不直接知道“这个样本比另一个样本好多少”。如果数据中混有质量差异较大的回答，交叉熵会按照数据出现频率推动模型拟合它们，而不是显式地对高质量回答加权、对低质量回答降权。

因此，更准确的说法不是“SFT 无法降低不良输出概率”，而是：**在没有偏好标签、奖励模型或数据重加权的情况下，SFT 缺少显式区分输出质量的优化信号**。

---

# 三、RL 与反向 KL

## 1. KL 正则化的 RL 目标

在 RLHF/RLAIF 中，策略模型 $\pi_\theta$ 会根据奖励模型或偏好信号继续优化。常见目标可以抽象为：

$$
\max_\theta\ 
\mathbb{E}_{y\sim \pi_\theta(\cdot|x)}[R(x,y)]
- \beta\,
D_{\text{KL}}\!\left(
\pi_\theta(\cdot|x)\|
\pi_{\text{ref}}(\cdot|x)
\right)
$$

其中：

- $R(x,y)$ 是奖励函数或奖励模型给出的分数；
- $\pi_{\text{ref}}$ 是冻结参考模型，常由 SFT 模型复制而来；
- $\beta$ 控制 KL 约束强度，$\beta$ 越大，模型越不容易偏离参考模型。

这里的 KL 项是：

$$
D_{\text{KL}}(\pi_\theta\|\pi_{\text{ref}})
= \mathbb{E}_{y\sim \pi_\theta}
\left[
\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}
\right]
$$

期望来自当前策略 $\pi_\theta$，所以它是以当前模型采样结果为基准，惩罚这些结果偏离参考模型太远。这就是“**RL 中常见 KL 约束对应反向 KL**”的含义。

## 2. KL 约束的作用

如果只最大化奖励，模型可能利用奖励模型漏洞，生成高分但不自然、不真实甚至无意义的回答。这类现象通常被称为 reward hacking。

反向 KL 约束的作用是把策略限制在参考模型附近：

- 防止模型跑到参考模型极低概率的区域；
- 降低奖励过优化带来的语言质量崩坏；
- 保持 SFT 阶段学到的格式、语气和基本能力；
- 允许模型在参考模型覆盖的空间内重新分配概率质量。

需要注意，语言模型经过 softmax 后通常不会给 token 严格的 0 概率，因此这里的“不能去参考模型为零的区域”更多是直觉说法。实际训练中，更常见的是：**参考模型概率越低的输出，当前策略若给出较高概率，就会付出越大的 KL 代价**。

## 3. 最优策略的直观形式

KL 正则化 RL 有一个很有用的理解方式。对固定输入 $x$，如果忽略参数化限制，目标

$$
\max_{\pi}\ 
\mathbb{E}_{y\sim \pi}[R(x,y)]
- \beta D_{\text{KL}}(\pi\|\pi_{\text{ref}})
$$

对应的最优策略满足：

$$
\pi^*(y|x)
\propto
\pi_{\text{ref}}(y|x)\exp\left(\frac{R(x,y)}{\beta}\right)
$$

这个式子说明了 RL 阶段的本质：**不是凭空创造一个新分布，而是在参考模型分布上按奖励进行指数重加权**。

- 奖励越高的回答，概率被放大；
- 参考模型原本概率很低的回答，即使奖励较高，也会受到先验概率限制；
- $\beta$ 越小，奖励重加权越激进；$\beta$ 越大，策略越接近参考模型。

这比简单说“RL 追求高分”更完整：RL 确实追求高奖励，但它是在 KL 约束下追求高奖励。

---

# 参考文献

- Howard Chen, Noam Razin, Karthik Narasimhan, Danqi Chen. *Retaining by Doing: The Role of On-Policy Data in Mitigating Forgetting*. arXiv:2510.18874, 2025. [https://arxiv.org/abs/2510.18874](https://arxiv.org/abs/2510.18874)
