---
title: "绝对位置编码"
date: "2025-09-01"
tags: ["Transformer", "位置编码", "绝对位置编码"]
category: "大语言模型"
excerpt: "Self-Attention 本身缺少顺序信息，绝对位置编码通过可学习向量或 Sinusoidal 函数为模型注入位置差异。"
---

Transformer 的核心计算是 Self-Attention。它擅长在序列内部建立全局依赖，但注意力本身并不知道 token 出现在第几个位置。如果不额外注入位置信息，模型很难区分“我喜欢你”和“你喜欢我”这类由顺序决定语义的句子。

Self-Attention 的置换等变性解释了为什么必须额外注入位置信息。下面重点梳理两类经典绝对位置编码：可学习位置向量与 Sinusoidal 位置编码。

---

# 一、位置编码的必要性

## 1. 注意力形式

给定输入序列表示 $X \in \mathbb{R}^{n \times d}$，Self-Attention 首先通过线性变换得到：

$$
Q = XW_Q,\qquad K = XW_K,\qquad V = XW_V
$$

然后计算注意力输出：

$$
\text{Attention}(Q,K,V)=\text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

其中第 $i$ 个 token 与第 $j$ 个 token 的交互，主要由 $q_i^T k_j$ 决定。

也就是说，在没有位置编码时，attention score 只依赖 token 内容向量之间的相似性。

## 2. 置换等变

如果只看 token embedding，Self-Attention 并不会天然知道 token 的顺序。假设对输入序列做一个置换矩阵 $P$，得到 $PX$，则：

$$
Q' = PXW_Q = PQ,\qquad K' = PK,\qquad V' = PV
$$

注意力矩阵变为：

$$
Q'K'^T = (PQ)(PK)^T = P QK^T P^T
$$

输出也会相应变为：

$$
\text{Attention}(PQ,PK,PV)=P\,\text{Attention}(Q,K,V)
$$

这说明 Self-Attention 对输入置换是**等变的**（Equivariant）：输入顺序被置换，输出也只是按同样方式被置换。

换句话说，如果把序列元素互换，所有 token 之间的“相似性关系表”也会被对应互换。模型结果只是随输入一起换位，并不会产生新的信号来判断“原始顺序到底是什么”。

**核心问题**：没有位置编码时，Self-Attention 只能看到内容相似性，看不到 token 出现在第几个位置。

## 3. 位置注入

因此需要给每个 token 注入一个位置相关的向量 $p_i$，使输入从原来的 token embedding $x_i$ 变为：

$$
\tilde{x}_i = x_i + p_i
$$

其中 $p_i$ 表示第 $i$ 个位置的位置编码。加入位置编码后，即使两个 token 的内容向量相同，只要它们位于不同位置，最终输入向量也会不同：

$$
x + p_i \neq x + p_j,\qquad i\neq j
$$

这样一来，后续计算得到的 $Q,K,V$ 不再只依赖 token 内容，也依赖 token 所在位置：

$$
Q=(X+P)W_Q,\qquad K=(X+P)W_K,\qquad V=(X+P)W_V
$$

于是 $QK^T$、注意力权重以及最终输出都会受到位置影响，模型才有可能学习前后关系、距离关系和绝对位置模式。

**关键结论**：位置编码的作用不是替代 token 内容，而是让 attention 的相似性计算从“只看内容”变成“同时看内容与位置”。

---

# 二、绝对位置编码

绝对位置编码（Absolute Positional Encoding）的核心思想是：**直接为每一个绝对位置分配一个向量**。

对于长度为 $n$ 的序列，可以构造位置矩阵：

$$
P =
\begin{bmatrix}
p_0 \\
p_1 \\
\vdots \\
p_{n-1}
\end{bmatrix}
\in \mathbb{R}^{n \times d}
$$

输入表示变为：

$$
\tilde{X} = X + P
$$

其中第 $i$ 行 $\tilde{x}_i = x_i + p_i$。

**直观含义**：token embedding 告诉模型“这个词是什么”，position embedding 告诉模型“这个词在哪里”。

---

# 三、可学习绝对位置编码

## 1. 参数形式

最直接的方法是把位置编码当作模型参数学习。设最大上下文长度为 $L$，隐藏维度为 $d$，则定义一个可学习矩阵：

$$
P_{\text{learned}} \in \mathbb{R}^{L \times d}
$$

第 $i$ 个位置直接取矩阵第 $i$ 行：

$$
p_i = P_{\text{learned}}[i]
$$

模型训练过程中，$P_{\text{learned}}$ 会和 token embedding、attention 参数一起通过反向传播更新。

## 2. 特点

- **表达能力强**：每个位置都有独立参数，模型可以自由学习位置模式。
- **实现简单**：本质上就是一个 embedding table。
- **适合固定长度训练**：当训练长度和推理长度基本一致时，可学习位置编码通常足够有效。

## 3. 外推问题

可学习位置编码的主要问题是长度外推能力弱。若训练时最大长度为 $L$，则模型只学习了位置 $0$ 到 $L-1$ 的向量。

当推理长度超过 $L$ 时，位置 $L,L+1,\dots$ 没有对应的已训练参数。即使强行扩展表格，新位置向量也没有经过训练，模型未必知道如何使用。

**关键结论**：可学习绝对位置编码对训练长度内的位置记忆能力强，但对训练长度外的位置泛化能力较弱。

---

# 四、Sinusoidal 位置编码

## 1. 公式

原始 Transformer 使用的是固定的 Sinusoidal 位置编码。对于位置 $pos$ 和维度索引 $i$，定义：

$$
PE(pos, 2i) = \sin\left(\frac{pos}{10000^{2i/d}}\right)
$$

$$
PE(pos, 2i+1) = \cos\left(\frac{pos}{10000^{2i/d}}\right)
$$

其中：

- $pos$：token 在序列中的绝对位置；
- $d$：模型隐藏维度；
- $2i$ 和 $2i+1$：一组相邻的偶数/奇数维度；
- $10000^{2i/d}$：控制不同维度的波长。

## 2. 频率

将公式改写为：

$$
PE(pos, 2i)=\sin(pos\cdot \omega_i)
$$

$$
PE(pos, 2i+1)=\cos(pos\cdot \omega_i)
$$

其中：

$$
\omega_i = 10000^{-2i/d}
$$

不同维度对应不同频率 $\omega_i$：

- 低维度 $i$ 较小，$\omega_i$ 较大，变化更快；
- 高维度 $i$ 较大，$\omega_i$ 较小，变化更慢。

这相当于用多组不同频率的波形共同表示位置。短波负责区分局部位置，长波负责提供更大尺度的位置变化。

## 3. 实现

```python
import torch

def sinusoidal_position_embedding(seq_len: int, dim: int, base: float = 10000.0):
    position = torch.arange(seq_len).float().unsqueeze(1)          # [seq_len, 1]
    index = torch.arange(0, dim, 2).float()                        # [dim / 2]
    inv_freq = base ** (-index / dim)                              # [dim / 2]

    angles = position * inv_freq                                  # [seq_len, dim / 2]
    pe = torch.zeros(seq_len, dim)
    pe[:, 0::2] = torch.sin(angles)
    pe[:, 1::2] = torch.cos(angles)
    return pe
```

---

# 五、正弦余弦性质

## 1. 周期表示

对于一个固定频率 $\omega$，位置 $pos$ 被映射到：

$$
(\sin(pos\omega),\cos(pos\omega))
$$

这可以理解为单位圆上的一个点。随着 $pos$ 增大，该点绕单位圆旋转。

因此，每一组 sin/cos 维度都可以看成一个二维旋转平面。

## 2. 位移线性化

Sinusoidal 位置编码的重要性质是：位置 $pos+k$ 的编码可以由位置 $pos$ 的编码线性表示。

根据三角恒等式：

$$
\sin((pos+k)\omega)=\sin(pos\omega)\cos(k\omega)+\cos(pos\omega)\sin(k\omega)
$$

$$
\cos((pos+k)\omega)=\cos(pos\omega)\cos(k\omega)-\sin(pos\omega)\sin(k\omega)
$$

写成矩阵形式：

$$
\begin{bmatrix}
\sin((pos+k)\omega) \\
\cos((pos+k)\omega)
\end{bmatrix}
=
\begin{bmatrix}
\cos(k\omega) & \sin(k\omega) \\
-\sin(k\omega) & \cos(k\omega)
\end{bmatrix}
\begin{bmatrix}
\sin(pos\omega) \\
\cos(pos\omega)
\end{bmatrix}
$$

这个矩阵只依赖相对位移 $k$，不依赖绝对位置 $pos$。

**关键结论**：Sinusoidal 位置编码虽然形式上是绝对位置编码，但它具备表达相对位移的线性结构。

## 3. RoPE 联系

这个性质也是理解 RoPE 的前置直觉。Sinusoidal 位置编码把位置写入输入向量，而 RoPE 则更进一步：直接把 query 和 key 按位置旋转，使相对位置自然进入注意力点积。

---

# 六、绝对位置编码的局限

## 1. 加法混合

绝对位置编码通常采用：

$$
\tilde{x}_i = x_i + p_i
$$

这种方式简单有效，但也带来一个问题：位置信息和内容信息在输入层被混合，后续层需要自己学习如何区分二者。

## 2. 相对距离

很多语言现象更依赖相对距离，而不是绝对位置。例如：

- 当前词与前一个词的关系；
- 主语和谓语之间相隔多少 token；
- 局部短语内部的相邻依赖。

绝对位置编码提供的是“第几个位置”，而不是“两个位置相隔多远”。模型可以从绝对位置中间接推断相对距离，但这不是显式结构。

## 3. 长度外推

对于可学习位置编码，超过训练长度的位置没有训练过。

对于 Sinusoidal 位置编码，虽然任意长度都能计算出位置向量，但模型训练时只见过有限范围内的位置组合。推理时出现更长位置，注意力分布仍可能发生明显漂移。

**核心问题**：能为更长位置生成编码，不等于模型学会了如何使用更长位置。

---

# 七、总结

绝对位置编码解决了 Transformer 不感知顺序的问题。可学习位置编码简单直接，适合固定长度场景；Sinusoidal 位置编码无需训练，利用多频率 sin/cos 波形表示位置，并具备一定的相对位移线性结构。

但绝对位置编码仍然把重点放在“每个 token 位于第几个位置”，而不是“两个 token 之间相隔多远”。这也是后来相对位置编码、RoPE 等方法继续发展的重要动机。
