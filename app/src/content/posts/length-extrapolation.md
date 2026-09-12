---
title: "位置编码长度外推"
date: "2025-05-28"
tags: ["RoPE", "长度外推"]
category: "大语言模型"
excerpt: "RoPE 能计算任意位置的旋转角，但这不等于模型能处理任意长度。本文介绍 PI、NTK-aware、Dynamic NTK 与 YaRN 等 RoPE 长度扩展方法。"
---

模型在训练阶段可能只处理过最长 4K 或 8K token 的序列，推理阶段却需要面对 32K、128K 甚至更长的上下文。此时，位置编码能否有效外推，将直接影响模型对超出训练长度文本的理解能力。

RoPE 可以为任意位置计算旋转角度，但这不等于模型天然具备任意长度外推能力。本文从 RoPE 的相位机制出发，梳理长度外推为什么困难，以及 Position Interpolation、NTK-aware、Dynamic NTK、YaRN 等常见 RoPE scaling 方法如何缓解这个问题。

> 前置知识：[RoPE 旋转位置编码](/blog/rope-encoding) 中的旋转与频率设计。

---

# 一、长度外推

## 1. 基本定义

长度外推（Length Extrapolation）指的是：模型在训练阶段只见过最大长度 $L_{\text{train}}$，但在推理阶段需要处理满足 $L_{\text{test}}>L_{\text{train}}$ 的更长序列。例如训练长度为 4K，推理长度为 32K，此时模型需要在从未训练过的位置范围内进行注意力计算。

## 2. 两层含义

长度外推至少包含两层问题：

1. **位置编码能否计算**：是否能为更长位置生成位置表示；
2. **模型能否使用**：模型是否能在更长位置上保持稳定的注意力和语义理解。

RoPE 满足第一点：任意位置 $m$ 都能计算 $m\theta_i$。

但第二点并不自动成立。训练中没有出现过的长距离相位、注意力分布和上下文组织方式，仍然可能导致模型退化。

---

# 二、绝对位置编码的外推问题

绝对位置编码的两类形式已在[绝对位置编码](/blog/absolute-encoding)中介绍，这里着重看它们在超出训练长度时的表现。

可学习位置编码通常是一张固定大小的参数表 $P\in\mathbb{R}^{L_{\max}\times d}$。当位置超出 $L_{\max}-1$ 时，表中没有对应参数；即使通过随机初始化或插值扩展参数表，新位置也没有经过训练。

Sinusoidal 位置编码则可以为任意位置计算 $PE(pos,2i)=\sin(pos\cdot\omega_i)$ 和 $PE(pos,2i+1)=\cos(pos\cdot\omega_i)$，因此它在形式上支持外推。

但模型训练时只见过 $pos<L_{\text{train}}$ 的位置模式，推理时极长位置仍可能使注意力分布落入训练外区域。两者共同说明：能生成位置编码，只是长度外推的必要条件，不是充分条件。

---

# 三、RoPE 为什么也会外推困难

RoPE 中 **第 $i$ 个维度组** 在 **位置 $m$** 的旋转角度取决于位置和频率：

$$
\phi_{m,i}=m\theta_i,\qquad \theta_i=\text{base}^{-2i/d}
$$

位置越大，相位 $\phi_{m,i}$ 越大。

## 1. 单个频率维度的周期重复

单个维度只能观察 $m\theta_i$ 模 $2\pi$ 后的相位。对于较大的 $\theta_i$，位置增大时相位会快速绕过多轮，因此训练内位置与训练外位置可能落在单位圆上相同或相近的位置。

这里只讨论单个频率维度的周期性；**RoPE 使用多组不同频率联合表示位置，所以这不等于整体位置编码必然碰撞**。真正的困难是模型还要处理训练阶段从未见过的多频率相位组合。

## 2. 相对距离超出训练分布

RoPE 的注意力分数依赖 $q_m^T R_{\Theta}(n-m)k_n$。训练时模型只见过 $|n-m|\le L_{\text{train}}$ 的距离，推理长上下文时却可能出现 $|n-m|\gg L_{\text{train}}$，这意味着模型需要处理训练阶段从未见过的相对距离相位。

## 3. 注意力分布漂移

长上下文不仅改变位置编码，还改变注意力的统计分布。例如可见 token 数量显著增加后，softmax 的竞争范围变大，远距离 token 的相似度模式也可能发生变化。

因此长度外推不是一个单纯的数学公式问题，而是位置编码、训练长度、注意力分布和任务数据共同作用的结果。

---

# 四、Position Interpolation

## 1. 核心思想

Position Interpolation 的核心是：**把更长的位置压缩回训练长度范围内**。

假设原训练长度为 $L_{\text{train}}$，目标推理长度为 $L_{\text{test}}$，缩放因子为 $s=L_{\text{test}}/L_{\text{train}}$。原本位置 $m$ 的 RoPE 角度为 $m\theta_i$，插值后改为：

$$
\frac{m}{s}\theta_i
=m\left(\frac{\theta_i}{s}\right)
$$

<div style="overflow-x:auto">
<svg width="100%" style="max-width:760px;min-width:680px" viewBox="0 0 760 300" role="img">
<title>Position Interpolation 将测试位置压回训练范围</title>
<desc>上方较长数轴表示零到测试长度的位置范围，下方较短数轴表示零到训练长度的位置范围；位置 m 经除以缩放因子 s 映射为 m 除以 s，测试终点也映射到训练终点。</desc>
<defs>
<marker id="length-pi-map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#888780" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="380" y="25" font-size="15" font-weight="600" text-anchor="middle" fill="currentColor">Position Interpolation：长范围压回训练区间</text>
<text x="60" y="54" font-size="13" fill="#993C1D">测试坐标（更长）</text>
<line x1="60" y1="76" x2="700" y2="76" stroke="#D85A30" stroke-width="3" stroke-linecap="round"/>
<line x1="60" y1="68" x2="60" y2="84" stroke="#D85A30" stroke-width="2"/>
<line x1="500" y1="68" x2="500" y2="84" stroke="#D85A30" stroke-width="2"/>
<line x1="700" y1="68" x2="700" y2="84" stroke="#D85A30" stroke-width="2"/>
<text x="60" y="103" font-size="13" text-anchor="middle" fill="currentColor">0</text>
<text x="500" y="61" font-size="13" font-weight="600" text-anchor="middle" fill="#D85A30">m</text>
<text x="700" y="103" font-size="13" text-anchor="middle" fill="#993C1D">L_test</text>
<path d="M60 88 C60 128 200 151 200 202" fill="none" stroke="#888780" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#length-pi-map-arrow)"/>
<path d="M500 88 C500 130 448 157 448 202" fill="none" stroke="#888780" stroke-width="1.75" marker-end="url(#length-pi-map-arrow)"/>
<path d="M700 88 C700 128 560 151 560 202" fill="none" stroke="#888780" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#length-pi-map-arrow)"/>
<rect x="300" y="124" width="160" height="36" rx="18" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.75"/>
<text x="380" y="142" font-size="14" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#854F0B">m → m / s</text>
<text x="200" y="199" font-size="13" fill="#0F6E56">训练坐标</text>
<line x1="200" y1="216" x2="560" y2="216" stroke="#0F6E56" stroke-width="3" stroke-linecap="round"/>
<line x1="200" y1="208" x2="200" y2="224" stroke="#0F6E56" stroke-width="2"/>
<line x1="448" y1="208" x2="448" y2="224" stroke="#0F6E56" stroke-width="2"/>
<line x1="560" y1="208" x2="560" y2="224" stroke="#0F6E56" stroke-width="2"/>
<text x="200" y="244" font-size="13" text-anchor="middle" fill="currentColor">0</text>
<text x="448" y="244" font-size="13" font-weight="600" text-anchor="middle" fill="#0F6E56">m / s</text>
<text x="560" y="244" font-size="13" text-anchor="middle" fill="#0F6E56">L_train</text>
<text x="380" y="280" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">s = L_test / L_train，端点与中间位置按同一比例映射</text>
</svg>
</div>

因此，位置 $m$ 被映射为 $m/s$；从频率角度看，等价于令 $\theta_i'=\theta_i/s$。特别地，$L_{\text{test}}/s=L_{\text{train}}$，测试端点及其中间位置的相位范围都被压回训练区间。

## 2. 简单实现

```python
import torch

def linear_scaled_inv_freq(dim, base=10000.0, scale=8.0, device=None):
    index = torch.arange(0, dim, 2, device=device).float()
    inv_freq = 1.0 / (base ** (index / dim))
    return inv_freq / scale
```

这里 `scale=8.0` 表示希望把上下文长度扩展约 8 倍。

## 3. 优缺点

优点：

- 简单直接，容易集成到现有 RoPE 实现中；
- 能显著缓解位置相位超出训练范围的问题。

局限：

- 所有频率被统一压缩，可能损失局部位置分辨率；
- 通常需要一定长上下文微调才能稳定发挥效果。

---

# 五、NTK-aware Scaling

## 1. 问题动机

Position Interpolation 对所有频率统一采用 $\theta_i'=\theta_i/s$。这虽然能扩展长度，但**高频维度也被明显压缩**，从而影响局部位置建模。

NTK-aware Scaling 的思路是：**不要等比例压缩所有频率，而是调整 RoPE 的 base，非均匀地重排频率谱**。

## 2. 调整 base

RoPE 频率为 $\theta_i=\text{base}^{-2i/d}$。若增大 `base`，则对于较大的 $i$，**$\theta_i$ 会变得更小，低频维度周期变长**，更适合长距离。

一种常见形式是：

$$
\text{base}' = \text{base}\cdot s^{d/(d-2)}
$$

其中 $s$ 是长度扩展倍数，$d$ 是参与 RoPE 的维度。代入频率公式可得 $\theta_i'=\theta_i\cdot s^{-2i/(d-2)}$，这里的缩放因子取决于维度索引 $i$。

因此不同于 Position Interpolation 对所有频率统一的缩放，**$i=0$ 时最高频率不变，$i$ 越大，频率降低得越多**。

## 3. 直观解释

增大 base 后：

- **最高频维度基本不变，其他频率按维度非均匀降低**，整体频率谱比线性插值更柔和；
- **高频部分相对保留更多局部分辨率**，低频维度获得更长周期。

**直观含义**：NTK-aware Scaling 试图在“保留短距离能力”和“扩展长距离范围”之间取得更平滑的折中。

---

# 六、Dynamic NTK Scaling

## 1. 静态缩放的问题

若预先把 RoPE 调整到很长上下文，例如 128K，那么即使实际输入只有 2K，也会一直使用为长上下文设计的频率。由于这套频率本是为远距离相位准备的，用在短序列上反而可能削弱局部位置分辨率，从而影响短上下文效果。

Dynamic NTK Scaling 的想法是：**根据当前实际序列长度动态调整 RoPE base**。

## 2. 动态调整

设当前输入长度为 $L$。**当 $L\le L_{\text{train}}$ 时保持原始 base 不变；当 $L>L_{\text{train}}$ 时，再根据 $L/L_{\text{train}}$ 调整 base。**

伪代码形式：

```python
def dynamic_ntk_base(base, seq_len, train_len, dim, factor=8.0):
    if seq_len <= train_len:
        return base

    dynamic_scale = (factor * seq_len / train_len) - (factor - 1)
    return base * dynamic_scale ** (dim / (dim - 2))
```

这里 `factor` 是配置的目标扩展因子，`seq_len/train_len` 才是当前长度比例。不同实现的具体公式可能略有差异，但核心思想一致：短上下文使用原始 RoPE，长上下文才逐步拉伸频率。

## 3. 优缺点

优点：

- 不需要为所有输入固定使用最大扩展比例，对短上下文更友好；
- 工程上适合长度变化较大的推理场景。

局限：

- 推理时不同长度使用不同频率，行为更复杂；
- 缩放因子变化后，历史 token 的 RoPE 结果也会变化；使用 KV cache 时需要缓存旋转前的 key、重新计算历史 key，或在单次请求中固定缩放因子。

---

# 七、YaRN

## 1. 核心思路

YaRN 将 NTK-by-parts 插值与注意力缩放结合起来。它不再对所有频率采用相同缩放比例，也不通过一个统一的新 base 重排整个频率谱，而是**保留高频、插值低频，并在中间频段平滑过渡**，同时缩放注意力 logits。

目标是缓解两个冲突：

- 长上下文需要适当压缩部分频率，避免低频维度直接进入训练外相位；
- 短上下文需要保留高频信息，避免局部位置分辨率下降。

## 2. 分频段插值

YaRN 根据各频率在原训练窗口内经历的旋转次数决定缩放方式：高频部分保留原频率，低频部分按 $1/s$ 插值，中间频段通过 ramp function 平滑过渡。下面以频率缩放比 $\theta_i'/\theta_i$ 对比三种策略；横轴严格沿用本文定义，$i=0$ 在左侧、对应最高频率，$i$ 越大则频率越低。

<div style="overflow-x:auto">
<svg width="100%" style="max-width:820px;min-width:740px" viewBox="0 0 820 430" role="img">
<title>PI、NTK-aware 与 YaRN 的频谱缩放对比</title>
<desc>横轴从左到右是递增的频率组索引，左侧 i 等于零为最高频，右侧索引较大为低频；纵轴是缩放后频率除以原频率。PI 在所有频率上统一取一除以 s，NTK-aware 从高频少变化平滑过渡到低频更多压缩，YaRN 保持高频不变、低频取一除以 s，并在中频平滑过渡。</desc>
<defs>
<marker id="length-spectrum-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#888780" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="410" y="24" font-size="15" font-weight="600" text-anchor="middle" fill="currentColor">三种方法如何缩放 RoPE 频率谱</text>
<line x1="92" y1="55" x2="124" y2="55" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.6"/>
<text x="134" y="59" font-size="13" fill="currentColor">PI：统一缩放</text>
<line x1="302" y1="55" x2="334" y2="55" stroke="#0F6E56" stroke-width="3"/>
<text x="344" y="59" font-size="13" fill="#0F6E56">NTK-aware：非均匀缩放</text>
<line x1="570" y1="55" x2="602" y2="55" stroke="#D85A30" stroke-width="3"/>
<text x="612" y="59" font-size="13" fill="#D85A30">YaRN：分频段缩放</text>
<rect x="120" y="90" width="180" height="250" fill="#E1F5EE" opacity="0.22"/>
<rect x="300" y="90" width="260" height="250" fill="currentColor" opacity="0.025"/>
<rect x="560" y="90" width="180" height="250" fill="#FAECE7" opacity="0.24"/>
<text x="210" y="110" font-size="12.5" text-anchor="middle" fill="#0F6E56">高频组</text>
<text x="430" y="110" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.65">中间频段</text>
<text x="650" y="110" font-size="12.5" text-anchor="middle" fill="#993C1D">低频组</text>
<line x1="120" y1="340" x2="120" y2="118" stroke="currentColor" stroke-width="1.5" opacity="0.55" marker-end="url(#length-spectrum-axis-arrow)"/>
<line x1="120" y1="340" x2="752" y2="340" stroke="currentColor" stroke-width="1.5" opacity="0.55" marker-end="url(#length-spectrum-axis-arrow)"/>
<line x1="114" y1="130" x2="126" y2="130" stroke="currentColor" stroke-width="1.25" opacity="0.55"/>
<line x1="114" y1="310" x2="126" y2="310" stroke="currentColor" stroke-width="1.25" opacity="0.55"/>
<text x="104" y="134" font-size="13" text-anchor="end" fill="currentColor">1</text>
<text x="104" y="314" font-size="13" text-anchor="end" fill="currentColor">1 / s</text>
<text x="58" y="230" font-size="13" text-anchor="middle" fill="currentColor" transform="rotate(-90 58 230)">频率缩放比 θ′ / θ</text>
<line x1="300" y1="116" x2="300" y2="340" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.18"/>
<line x1="560" y1="116" x2="560" y2="340" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.18"/>
<path d="M120 310 H740" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5" opacity="0.6"/>
<path d="M120 130 C270 143 505 246 740 310" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round"/>
<path d="M120 130 H285 C375 130 478 310 575 310 H740" fill="none" stroke="#D85A30" stroke-width="3" stroke-linecap="round"/>
<circle cx="120" cy="130" r="4.5" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.5"/>
<circle cx="285" cy="130" r="4" fill="#FAECE7" stroke="#D85A30" stroke-width="1.5"/>
<circle cx="575" cy="310" r="4" fill="#FAECE7" stroke="#D85A30" stroke-width="1.5"/>
<text x="120" y="374" font-size="13" text-anchor="start" fill="#0F6E56">高频：i = 0</text>
<text x="430" y="374" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">维度 / 频率组索引 i 增大 →</text>
<text x="740" y="374" font-size="13" text-anchor="end" fill="#993C1D">低频：i 较大</text>
<rect x="128" y="392" width="604" height="28" rx="14" fill="#FAEEDA" opacity="0.85"/>
<text x="430" y="406" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#854F0B">YaRN：高频不变 · 中频平滑过渡 · 低频按 1 / s 插值</text>
</svg>
</div>

图中 PI 对所有频率使用同一比例；NTK-aware 的高频变化较少、低频压缩更多；YaRN 则明确分段，在保留局部分辨率的同时延长低频周期。

## 3. 注意力缩放

YaRN 还会配合注意力 logit 缩放。原因是上下文变长后，注意力熵和分数分布可能变化，仅调整位置相位未必足够。

工程实现通常通过同时缩放 RoPE 作用后的 query 和 key，等价地改变注意力 logits，而不必改写注意力计算。YaRN 因而同时处理频率谱和长上下文下的注意力稳定性。

---

# 八、方法对比

| 方法 | 核心做法 | 优点 | 风险 |
|------|----------|------|------|
| Position Interpolation | 将位置 $m$ 压缩为 $m/s$，等价于频率除以 $s$ | 简单稳定，容易实现 | 可能损失局部分辨率 |
| NTK-aware Scaling | 增大 RoPE base，调整频率谱 | 更好平衡短距与长距 | 公式与实现选择更多 |
| Dynamic NTK | 根据当前长度动态调整 base | 短上下文保持原始行为 | KV cache 需要特殊处理 |
| YaRN | 分频段缩放并配合注意力缩放 | 长上下文效果更强 | 实现更复杂，依赖调参 |

---


# 参考资料

1. [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
2. [Extending Context Window of Large Language Models via Positional Interpolation](https://arxiv.org/abs/2306.15595)
3. [YaRN: Efficient Context Window Extension of Large Language Models](https://arxiv.org/abs/2309.00071)
4. [EleutherAI: Extending the RoPE](https://blog.eleuther.ai/yarn/)
5. [Hugging Face: Utilities for Rotary Embedding](https://huggingface.co/docs/transformers/en/internal/rope_utils)
