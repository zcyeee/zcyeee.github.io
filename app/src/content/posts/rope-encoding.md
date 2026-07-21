---
title: "RoPE 旋转位置编码"
date: "2025-05-22"
tags: ["RoPE", "位置编码"]
category: "大语言模型"
excerpt: "RoPE 把位置信息编码为 Q/K 空间中的旋转操作，本文拆解其二维分组与频率设计，并给出相对位移性质、复数视角与代码实现。"
---

RoPE（Rotary Position Embedding）不像绝对位置编码那样把位置向量加到 token embedding 上，而是对 query 和 key 做位置相关的旋转：表面上用绝对位置 $i,j$ 旋转向量，点积后却自然转化为相对位置 $j-i$，让位置信息以简洁的方式进入 attention score。

本文依次讲解 RoPE 的基本定义、二维分组与频率设计、相对位移性质、复数视角，并给出 PyTorch 实现。阅读前可先了解 [绝对位置编码](/blog/absolute-encoding) 中的动机，以及 **[旋转矩阵基础](/blog/rotation-matrix) 中的代数性质**。

---

# 一、基本概念

## 1. 从加法位置编码到旋转位置编码

传统绝对位置编码通常写成：

$$
\tilde{x}_i=x_i+p_i
$$

其中 $x_i$ 是第 $i$ 个 token 的内容向量，$p_i$ 是第 $i$ 个位置的位置向量。

RoPE 不再把位置信息加到向量上，而是让位置信息旋转向量。对每个位置 $pos$，定义一个旋转变换矩阵 $R(\theta_{pos})$，并将该位置的 query 或 key 旋转对应角度。

设：

- $Q_i \in \mathbb{R}^d$：位置 $i$ 的 query 向量，尚未编码位置；
- $K_j \in \mathbb{R}^d$：位置 $j$ 的 key 向量，尚未编码位置；
- $d$：单个 attention head 的维度，通常要求为偶数，便于按二维分组。

RoPE 旋转后得到：

$$
\tilde{Q}_i=R(\theta_i)Q_i,\qquad \tilde{K}_j=R(\theta_j)K_j
$$

然后**使用旋转后的 query 和 key 计算注意力分数**：

$$
\text{score}(i,j)=\tilde{Q}_i^T\tilde{K}_j
$$

> **即位置不再以加法形式进入输入向量，而是以旋转形式进入注意力分数。**

不同于绝对位置编码把 $p_i$ 加在投影之前，$Q,K,V$ 无差别地带上位置信息（详见 [绝对位置编码](/blog/absolute-encoding)）；RoPE 的旋转发生在投影之后，只旋转 $Q,K$、不旋转 $V$。

因此注意力权重由 $QK^T$ 决定，**位置只需要影响权重，不会扭曲 $V$ 承载的内容信息，这也是 RoPE 相比绝对位置编码的优越性。**

---

# 二、二维分组与频率设计

## 1. 高维向量的二维配对

query 向量 $Q_i\in\mathbb{R}^d$ 按相邻两维分组，写成 $d/2$ 个二维子向量：

$$
Q_i=[q_{i,0},q_{i,1},\dots,q_{i,d/2-1}],\qquad q_{i,k}\in\mathbb{R}^2
$$

RoPE 让每个二维子向量独立旋转，对应的 $d\times d$ 旋转矩阵就是这些二维旋转的拼接，写成块对角形式：

$$
R(\theta_i)
=
\operatorname{block\_diag}
\left(
R(\theta_{i,0}),
R(\theta_{i,1}),
\dots,
R(\theta_{i,d/2-1})
\right)
$$

> 实现中不会显式构造 $d\times d$ 矩阵——因为绝大多数元素是 $0$，直接做矩阵乘法会浪费大量算力。工程上通常把旋转展开成逐元素的 $\cos,\sin$ 乘法，避免稀疏矩阵的无效计算。

其中第 $k$ 个二维子空间的旋转角度为：

$$
\theta_{i,k}=pos_i\cdot 10000^{-2k/d}=pos_i\cdot \omega_k
$$

并且：

$$
\omega_k=10000^{-2k/d}
$$

$\omega_k$ 是第 $k$ 个二维子空间对应的旋转频率，随着 $k$ 增大而单调递减。

## 2. 高频与低频

不同维度组使用不同频率，是 RoPE 能表达多尺度位置关系的关键。

- 当 $k$ 较小时，$\omega_k$ 较大，旋转角变化快，适合捕捉短距离关系，也就是高频分量。
- 当 $k$ 较大时，$\omega_k$ 较小，旋转角变化慢，适合捕捉长距离关系，也就是低频分量。

---

# 三、相对位移性质

## 1. RoPE 后的注意力分数

原始注意力分数为 $\text{score}(i,j)=Q_i^TK_j$。RoPE 旋转后：

$$
\tilde{Q}_i^T\tilde{K}_j
=
\left(R(\theta_i)Q_i\right)^T
\left(R(\theta_j)K_j\right)
$$

由 [旋转矩阵基础](/blog/rotation-matrix) 中已证明的性质 $R(\theta)^TR(\theta')=R(\theta'-\theta)$，可以直接得到：

$$
\tilde{Q}_i^T\tilde{K}_j=Q_i^TR(\theta_j-\theta_i)K_j
$$

## 2. 相对位置差推导

对第 $k$ 个二维子空间，有：

$$
\theta_{j,k}-\theta_{i,k}
=(pos_j-pos_i)\cdot\omega_k
$$

也就是说，RoPE 旋转后的注意力分数依赖的是相对位置差 $pos_j-pos_i$，而不是单独的 $pos_i$ 和 $pos_j$。

> 相对位置信息被隐式内置在旋转操作中，不需要额外的相对位置表。

这一点可以理解为：

- 模型看到的不是两个 token 各自的绝对位置，而是它们在不同频率维度上的相对相位差；
- 这种“旋转差”自然反映 token 之间的相对距离；
- 公式本身可以计算任意位置，因此形式上支持更长位置的外推。

需要注意的是，**公式能计算更长位置，不等于模型一定能无损处理任意长上下文。实际外推效果仍受训练长度和频率分布影响。**

## 3. 直观理解

可以把每个二维子空间想象成一个平面：query、key 各自旋转到 $\theta_i,\theta_j$，两者的夹角就是上面推导出的相对相位 $\theta_j-\theta_i$。两个 token 的相对距离越近，它们在大多数频率维度上的夹角就越小；距离越远，夹角越大——这就是“旋转差编码相对距离”在几何上的直观图像。

不过这只是提供了一个结构化的位置通道，而不是“距离越近注意力越强”的硬性规定：注意力的实际强弱仍由内容向量和模型参数共同决定。

## 4. 复数视角

二维旋转与复数乘法等价（证明见 [旋转矩阵基础](/blog/rotation-matrix)）：把 $(x_{2k},x_{2k+1})$ 看作复数 $z_k=x_{2k}+jx_{2k+1}$，位置 $pos$ 对第 $k$ 组的旋转就是让 $z_k$ 乘上单位复数 $e^{j\,pos\,\omega_k}$。于是 query 的第 $k$ 组带上相位 $e^{j\,pos_i\omega_k}$，key 的第 $k$ 组带上相位 $e^{j\,pos_j\omega_k}$；计算相似度时两者共轭相乘，相位相减，得到 $e^{j(pos_j-pos_i)\omega_k}$，这正对应矩阵形式中的旋转 $R((pos_j-pos_i)\omega_k)$。可见复数写法与矩阵写法本质相同，只是把二维旋转压缩成了一次复数乘法，形式更紧凑。

## 5. 与绝对位置编码的区别

| 方法 | 注入位置 | 位置进入方式 | 相对距离 |
|------|----------|--------------|----------|
| 绝对位置编码 | 输入 embedding | $x_i+p_i$ | 需要模型间接学习 |
| RoPE | Attention 的 Q/K | $R(\theta_i)Q_i,\ R(\theta_j)K_j$ | 点积中自然出现 $pos_j-pos_i$ |

RoPE 不需要额外 attention bias，也不改变 attention 的矩阵形状，因此在工程上比较简洁。

---

# 四、代码实现

## 1. 生成 cos/sin cache

```python
import torch

def build_rope_cache(seq_len: int, dim: int, base: float = 10000.0, device=None):
    index = torch.arange(0, dim, 2, device=device).float()
    inv_freq = 1.0 / (base ** (index / dim))              # [dim / 2]

    positions = torch.arange(seq_len, device=device).float()
    angles = torch.outer(positions, inv_freq)             # [seq_len, dim / 2]

    angles = torch.repeat_interleave(angles, repeats=2, dim=-1)
    cos = torch.cos(angles)                               # [seq_len, dim]
    sin = torch.sin(angles)                               # [seq_len, dim]
    return cos, sin
```

这里把每个角度重复两次，是为了和原始向量的偶数/奇数维度对齐。

## 2. rotate_half

二维旋转公式为：

$$
\tilde{x}_{2k}=x_{2k}\cos - x_{2k+1}\sin
$$

$$
\tilde{x}_{2k+1}=x_{2k}\sin + x_{2k+1}\cos
$$

可以写成：

$$
\tilde{x}=x\cdot\cos+\operatorname{rotate\_half}(x)\cdot\sin
$$

其中：

```python
def rotate_half(x):
    x_even = x[..., 0::2]
    x_odd = x[..., 1::2]
    rotated = torch.stack((-x_odd, x_even), dim=-1)
    return rotated.flatten(-2)
```

## 3. 应用 RoPE

```python
def apply_rope(q, k, cos, sin, position_ids):
    # q, k: [batch, heads, seq_len, head_dim]
    # cos, sin: [max_seq_len, head_dim]
    cos = cos[position_ids].unsqueeze(1)                  # [batch, 1, seq_len, head_dim]
    sin = sin[position_ids].unsqueeze(1)

    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed
```

这段代码表达的正是：

$$
\tilde{Q}_i=R(\theta_i)Q_i,\qquad \tilde{K}_j=R(\theta_j)K_j
$$

---

# 参考资料

1. [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
2. [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
