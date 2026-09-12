---
title: "绝对位置编码"
date: "2025-05-12"
tags: ["位置编码", "绝对位置编码"]
category: "大语言模型"
excerpt: "Self-Attention 本身缺少顺序信息，绝对位置编码通过可学习向量或 Sinusoidal 函数为模型注入位置差异。"
---

Transformer 的核心计算是 Self-Attention。它擅长在序列内部建立全局依赖，但注意力本身并不知道 token 出现在第几个位置。如果不额外注入位置信息，模型很难区分“我喜欢你”和“你喜欢我”这类由顺序决定语义的句子。

本文先从注意力的置换等变性出发说明位置编码的必要性，再梳理两类经典绝对位置编码——可学习位置向量与 Sinusoidal 位置编码，最后分析它们的局限，并引出相对位置编码与 RoPE 的发展动机。

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

也就是说，**没有位置编码时，attention score 只依赖 token 内容向量之间的相似性。**

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

这说明 Self-Attention 对输入是**置换等变的**（Equivariant）：输入顺序被置换，注意力矩阵的行列和输出也按同一置换移动。注意力权重仍可随 token 内容而不同；关键在于，没有位置编码时，置换输入只会同步置换内容关系和输出，模型无法从中识别排列顺序本身。

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

由于**位置向量 $P$ 在输入层直接加到 $X$ 上**，发生在 $W_Q,W_K,W_V$ 投影之前。意味着 $Q,K,V$ 三者都是由同一个 $X+P$ 变换而来，位置信息会无差别地混入 $Q,K,V$，模型无法只让 $Q,K$ 带位置信息而不影响 $V$。

**注意：[RoPE 旋转位置编码](/blog/rope-encoding) 只旋转 $Q,K$，不改动 $V$。**

> 位置编码的作用不是替代 token 内容，而是让 attention 的相似性计算从“只看内容”变成“同时看内容与位置”，但**代价是 Q、K、V 会被同等程度地卷入位置信息**，没有选择性。

把这个思路推广到整段长度为 $n$ 的序列，就得到了**绝对位置编码（Absolute Positional Encoding）**——直接为每一个绝对位置分配一个向量，堆叠成位置矩阵：

$$
P=\begin{bmatrix}p_0\\p_1\\\vdots\\p_{n-1}\end{bmatrix}\in\mathbb{R}^{n\times d},\qquad \tilde{X}=X+P
$$

> token embedding 告诉模型“这个词是什么”，position embedding 告诉模型“这个词在哪里”。

下面分别介绍两种经典实现：可学习位置向量与 Sinusoidal 位置编码。

---

# 二、可学习绝对位置编码

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

> 可学习绝对位置编码对训练长度内的位置记忆能力强，但对训练长度外的位置泛化能力较弱。

---

# 三、Sinusoidal 位置编码

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

- **低维度 $i$ 较小，$\omega_i$ 较大，变化更快；**
- **高维度 $i$ 较大，$\omega_i$ 较小，变化更慢。**

将纵轴设为 token 位置、横轴设为维度组，可以同时观察所有频率随位置的变化。由于 $\omega_i$ 按指数规律衰减，横轴实际表示维度组 $i$，上方标出对应的频率方向：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:760px;min-width:680px" viewBox="0 0 760 462" role="img">
<title>Sinusoidal 位置编码的频率热力图</title>
<desc>纵轴表示 token 位置 pos，横轴表示维度组 i，对应频率从左侧的高频逐渐降低到右侧的低频。颜色以正弦通道为例表示编码值，左侧随位置快速交替，右侧变化更慢。</desc>
<defs>
<marker id="absolute-frequency-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<linearGradient id="absolute-frequency-band-0" x1="0" y1="90" x2="0" y2="126" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-1" x1="0" y1="90" x2="0" y2="138" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-2" x1="0" y1="90" x2="0" y2="154" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-3" x1="0" y1="90" x2="0" y2="178" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-4" x1="0" y1="90" x2="0" y2="210" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-5" x1="0" y1="90" x2="0" y2="254" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-6" x1="0" y1="90" x2="0" y2="314" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
<linearGradient id="absolute-frequency-band-7" x1="0" y1="90" x2="0" y2="410" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
<stop offset="0" stop-color="#F1EFE8"/>
<stop offset="0.25" stop-color="#1D9E75"/>
<stop offset="0.5" stop-color="#F1EFE8"/>
<stop offset="0.75" stop-color="#D85A30"/>
<stop offset="1" stop-color="#F1EFE8"/>
</linearGradient>
</defs>
<g transform="translate(-24 0)">
<text x="444" y="24" font-size="15.5" font-weight="600" text-anchor="middle" fill="currentColor">维度组 i（每组对应一对 sin / cos 通道）</text>
<text x="184" y="52" font-size="13" font-weight="600" fill="#0F6E56">低维度 · 高频 ω 大</text>
<text x="704" y="52" font-size="13" font-weight="600" text-anchor="end" fill="#D85A30">高维度 · 低频 ω 小</text>
<line x1="184" y1="64" x2="704" y2="64" stroke="currentColor" stroke-width="1.5" marker-end="url(#absolute-frequency-axis-arrow)" opacity="0.65"/>
<text x="444" y="82" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.6">频率按指数规律降低，而非线性等间隔</text>
<line x1="150" y1="90" x2="150" y2="370" stroke="currentColor" stroke-width="1.5" marker-end="url(#absolute-frequency-axis-arrow)" opacity="0.65"/>
<text x="110" y="230" font-size="13" text-anchor="middle" fill="currentColor" transform="rotate(-90 110 230)">token 位置 pos 增大</text>
<text x="136" y="95" font-size="12" text-anchor="end" fill="currentColor" opacity="0.65">0</text>
<text x="136" y="165" font-size="12" text-anchor="end" fill="currentColor" opacity="0.65">8</text>
<text x="136" y="235" font-size="12" text-anchor="end" fill="currentColor" opacity="0.65">16</text>
<text x="136" y="305" font-size="12" text-anchor="end" fill="currentColor" opacity="0.65">24</text>
<text x="136" y="375" font-size="12" text-anchor="end" fill="currentColor" opacity="0.65">32</text>
<rect x="184" y="90" width="65" height="280" fill="url(#absolute-frequency-band-0)"/>
<rect x="249" y="90" width="65" height="280" fill="url(#absolute-frequency-band-1)"/>
<rect x="314" y="90" width="65" height="280" fill="url(#absolute-frequency-band-2)"/>
<rect x="379" y="90" width="65" height="280" fill="url(#absolute-frequency-band-3)"/>
<rect x="444" y="90" width="65" height="280" fill="url(#absolute-frequency-band-4)"/>
<rect x="509" y="90" width="65" height="280" fill="url(#absolute-frequency-band-5)"/>
<rect x="574" y="90" width="65" height="280" fill="url(#absolute-frequency-band-6)"/>
<rect x="639" y="90" width="65" height="280" fill="url(#absolute-frequency-band-7)"/>
<rect x="184" y="90" width="520" height="280" fill="none" stroke="currentColor" stroke-width="1" opacity="0.45"/>
<path d="M249 90V370M314 90V370M379 90V370M444 90V370M509 90V370M574 90V370M639 90V370" fill="none" stroke="currentColor" stroke-width="0.75" opacity="0.25"/>
<path d="M184 160H704M184 230H704M184 300H704" fill="none" stroke="currentColor" stroke-width="0.75" opacity="0.25"/>
<text x="216.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">i = 0</text>
<text x="281.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">1</text>
<text x="346.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">2</text>
<text x="411.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">3</text>
<text x="476.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">…</text>
<text x="541.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">…</text>
<text x="606.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">…</text>
<text x="671.5" y="392" font-size="12" text-anchor="middle" fill="currentColor">d / 2 − 1</text>
<text x="184" y="432" font-size="12.5" fill="currentColor" opacity="0.65">sin(pos · ωᵢ) 的值：</text>
<rect x="315" y="417" width="28" height="18" rx="4" fill="#D85A30"/>
<text x="352" y="431" font-size="12" fill="currentColor">−1</text>
<rect x="388" y="417" width="28" height="18" rx="4" fill="#F1EFE8" stroke="currentColor" stroke-width="0.5" stroke-opacity="0.35"/>
<text x="425" y="431" font-size="12" fill="currentColor">0</text>
<rect x="454" y="417" width="28" height="18" rx="4" fill="#1D9E75"/>
<text x="491" y="431" font-size="12" fill="currentColor">+1</text>
<text x="704" y="454" font-size="12" text-anchor="end" fill="currentColor" opacity="0.6">cos 通道具有相同频率，仅相位错开 π / 2</text>
</g>
</svg>
</div>

左侧高频列随 token 位置快速交替，适合区分局部位置；右侧低频列变化缓慢，提供更大尺度的位置信号。

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

## 4. 正弦余弦性质

**周期表示**：对于一个固定频率 $\omega$，位置 $pos$ 被映射到：

$$
(\sin(pos\omega),\cos(pos\omega))
$$

这可以理解为单位圆上的一个点。随着 $pos$ 增大，该点绕单位圆旋转。因此，每一组 sin/cos 维度都可以看成一个二维旋转平面。

**位移线性化**：Sinusoidal 位置编码还有一个重要性质：位置 $pos+k$ 的编码可以由位置 $pos$ 的编码线性表示。

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

> 即 Sinusoidal 位置编码虽然形式上是绝对位置编码，但它具备表达相对位移的线性结构。

这个性质是理解 RoPE 的前置直觉。Sinusoidal 位置编码把位置写入输入向量，而 RoPE 则更进一步：直接把 query 和 key 按位置旋转，使相对位置自然进入注意力点积，具体可见 [RoPE 旋转位置编码](/blog/rope-encoding)。

---

# 四、绝对位置编码的局限

## 1. 加法混合

绝对位置编码通常采用：

$$
\tilde{x}_i = x_i + p_i
$$

这种方式简单有效，但也带来一个问题：**位置信息和内容信息在输入层被混合，$Q,K,V$ 会无差别地同时带上位置信息**（详见「一」），后续层需要自己学习如何区分二者。

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

# 五、总结

**绝对位置编码解决了 Transformer 不感知顺序的问题。**可学习位置编码简单直接，适合固定长度场景；Sinusoidal 位置编码无需训练，利用多频率 sin/cos 波形表示位置，并具备一定的相对位移线性结构。

但绝对位置编码用加法把位置信息和内容信息混在一起，**$Q,K,V$ 无差别地带上位置信息，重点也停留在“每个 token 位于第几个位置”，而不是“两个 token 之间相隔多远”。**这也是后来相对位置编码、RoPE 等方法继续发展的重要动机。

---

# 参考资料

1. [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
2. [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/)
