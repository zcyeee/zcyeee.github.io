---
title: "旋转矩阵基础"
date: "2025-05-22"
tags: ["旋转矩阵", "线性代数", "RoPE"]
category: "数学基础"
excerpt: "梳理二维旋转的几何直觉、正交性质、角度叠加与复数表示，为理解 RoPE 的旋转机制铺垫基础。"
---

本文从二维旋转矩阵的定义出发，梳理它的几何意义、代数性质、点积中的相对角度结构，以及复数乘法视角。这些性质会在 [RoPE 旋转位置编码](/blog/rope-encoding) 中出现，因此本文可视为理解 RoPE 的数学前置。

---

# 一、二维旋转矩阵

## 1. 基本定义

二维平面中，将向量**逆时针旋转**角度 $\theta$ 的矩阵为：

$$
R(\theta)=
\begin{bmatrix}
\cos\theta & -\sin\theta \\
\sin\theta & \cos\theta
\end{bmatrix}
$$

给定二维向量：

$$
x=
\begin{bmatrix}
x_1 \\
x_2
\end{bmatrix}
$$

旋转后的向量为：

$$
x' = R(\theta)x
$$

即：

$$
\begin{bmatrix}
x_1' \\
x_2'
\end{bmatrix}
=
\begin{bmatrix}
\cos\theta & -\sin\theta \\
\sin\theta & \cos\theta
\end{bmatrix}
\begin{bmatrix}
x_1 \\
x_2
\end{bmatrix}
$$

展开得到：

$$
x_1' = x_1\cos\theta - x_2\sin\theta
$$

$$
x_2' = x_1\sin\theta + x_2\cos\theta
$$

## 2. 几何意义

下图把 $x$ 与 $x'=R(\theta)x$ 画在同一坐标系中：旋转只改变方向，两个端点与原点的距离保持相同。

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:600px" viewBox="0 0 680 300" role="img">
<title>二维向量逆时针旋转并保持长度</title>
<desc>第一象限中，原向量 x 从原点指向右上方，经过角度 θ 的逆时针旋转后得到更靠上的 x′。两支向量的端点位于同一条四分之一圆弧上，表示旋转前后长度相等。</desc>
<defs>
<marker id="rotation-basic-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="rotation-basic-green-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#0F6E56" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="rotation-basic-orange-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="34" y="28" font-size="16" font-weight="600" fill="currentColor">二维旋转：方向改变，长度不变</text>
<text x="34" y="49" font-size="12.5" fill="currentColor" opacity="0.65">x′ = R(θ)x，正角度表示逆时针旋转</text>
<path d="M250 260A160 160 0 0 0 90 100" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 6" opacity="0.22"/>
<path d="M70 260H392" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.45" marker-end="url(#rotation-basic-axis-arrow)"/>
<path d="M90 280V70" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.45" marker-end="url(#rotation-basic-axis-arrow)"/>
<text x="388" y="249" font-size="12" text-anchor="end" fill="currentColor" opacity="0.62">第 1 维</text>
<text x="104" y="77" font-size="12" fill="currentColor" opacity="0.62">第 2 维</text>
<path d="M90 260L228.6 180" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round" marker-end="url(#rotation-basic-green-arrow)"/>
<path d="M90 260L157.6 115" fill="none" stroke="#BA7517" stroke-width="3" stroke-linecap="round" marker-end="url(#rotation-basic-orange-arrow)"/>
<path d="M129 237.5A45 45 0 0 0 109 219.2" fill="none" stroke="#BA7517" stroke-width="2" stroke-linecap="round" marker-end="url(#rotation-basic-orange-arrow)"/>
<circle cx="90" cy="260" r="4.5" fill="currentColor"/>
<text x="76" y="282" font-size="12.5" fill="currentColor" opacity="0.72">原点</text>
<text x="239" y="179" font-size="15" font-weight="600" fill="#0F6E56">x</text>
<text x="151" y="101" font-size="15" font-weight="600" fill="#BA7517">x′</text>
<text x="114" y="222" font-size="13.5" font-weight="600" fill="#BA7517">θ</text>
<text x="148" y="232" font-size="12" fill="#BA7517">逆时针</text>
<rect x="430" y="82" width="204" height="88" rx="10" fill="currentColor" opacity="0.045"/>
<line x1="450" y1="110" x2="478" y2="110" stroke="#0F6E56" stroke-width="3" stroke-linecap="round"/>
<text x="490" y="114" font-size="13.5" fill="currentColor">∥x∥ = r</text>
<line x1="450" y1="141" x2="478" y2="141" stroke="#BA7517" stroke-width="3" stroke-linecap="round"/>
<text x="490" y="145" font-size="13.5" fill="currentColor">∥x′∥ = r</text>
<rect x="416" y="202" width="232" height="66" rx="10" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.75"/>
<text x="532" y="225" font-size="12.5" text-anchor="middle" fill="#085041">端点落在同一条半径 r 圆弧上</text>
<text x="532" y="251" font-size="15" font-weight="600" text-anchor="middle" fill="#04342C">∥x′∥ = ∥x∥</text>
</svg>
</div>

---

# 二、长度保持与正交性

## 1. 旋转矩阵的转置

旋转矩阵的转置为：

$$
R(\theta)^T=
\begin{bmatrix}
\cos\theta & \sin\theta \\
-\sin\theta & \cos\theta
\end{bmatrix}
$$

注意到：

$$
R(-\theta)=
\begin{bmatrix}
\cos\theta & \sin\theta \\
-\sin\theta & \cos\theta
\end{bmatrix}
$$

因此：

$$
R(\theta)^T = R(-\theta)
$$

## 2. 正交矩阵

计算 $R(\theta)^T R(\theta)$：

$$
R(\theta)^T R(\theta)=I
$$

因此旋转矩阵是正交矩阵。

对于任意向量 $x$，旋转后的长度满足：

$$
\|R(\theta)x\|^2
= (R(\theta)x)^T(R(\theta)x)
= x^T R(\theta)^T R(\theta)x
= x^T x
= \|x\|^2
$$

> 旋转矩阵保持向量长度不变。

## 3. 点积结构保持

对于两个向量 $x,y$，若它们同时旋转同一个角度：

$$
(R(\theta)x)^T(R(\theta)y)
= x^T R(\theta)^T R(\theta)y
= x^T y
$$

也就是说，同时旋转不会改变两个向量之间的点积。

> 如果整个坐标系一起旋转，两个向量之间的相对关系不会变化。

---

# 三、旋转角度的可加性

## 1. 两次旋转等于角度相加

先旋转 $\alpha$，再旋转 $\beta$，结果等价于一次旋转 $\alpha+\beta$：

$$
R(\beta)R(\alpha)=R(\alpha+\beta)
$$

这是旋转矩阵最重要的性质之一。

## 2. 代数推导

根据三角恒等式：

$$
\cos(\alpha+\beta)=\cos\alpha\cos\beta-\sin\alpha\sin\beta
$$

$$
\sin(\alpha+\beta)=\sin\alpha\cos\beta+\cos\alpha\sin\beta
$$

矩阵相乘可得：

$$
R(\beta)R(\alpha)=
\begin{bmatrix}
\cos(\alpha+\beta) & -\sin(\alpha+\beta) \\
\sin(\alpha+\beta) & \cos(\alpha+\beta)
\end{bmatrix}
=R(\alpha+\beta)
$$

## 3. 反向旋转

由「二、2」已知 $R(\theta)$ 是正交矩阵，即 $R(\theta)^TR(\theta)=I$，这说明转置与逆矩阵是同一个矩阵：

$$
R(\theta)^{-1} = R(\theta)^T
$$

再结合本节开头的 $R(\theta)^T = R(-\theta)$，两者相拼即可得到旋转的逆矩阵：

$$
R(\theta)^{-1}=R(\theta)^T=R(-\theta)
$$

这表示反向旋转同样的角度即可回到原向量。

---

# 四、点积中的相对角度

## 1. 两个向量旋转不同角度

现在考虑两个向量 $q,k$。下图取 $n>m$，并暂时将二者的初始方向对齐，以单独显示位置旋转产生的夹角 $(n-m)\theta$；一般情形不要求 $q,k$ 同向，后面的矩阵推导仍然成立。

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:620px" viewBox="0 0 680 400" role="img">
<title>查询向量与键向量旋转后的相对角度</title>
<desc>示意图令 q 与 k 的初始方向对齐。q 逆时针旋转 mθ，k 逆时针旋转 nθ，且 n 大于 m；两条旋转后向量之间的夹角为 (n−m)θ，说明点积中的位置依赖只与相对旋转有关。</desc>
<defs>
<marker id="rotation-relative-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="rotation-relative-green-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#0F6E56" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="rotation-relative-orange-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="34" y="28" font-size="16" font-weight="600" fill="currentColor">两个绝对旋转，相减得到相对角度</text>
<text x="34" y="49" font-size="12.5" fill="currentColor" opacity="0.65">示意取 n &gt; m；共同初始方向仅用于隔离位置带来的旋转差</text>
<path d="M56 270H426" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.35" marker-end="url(#rotation-relative-axis-arrow)"/>
<path d="M220 325V75" fill="none" stroke="currentColor" stroke-width="1" opacity="0.18" marker-end="url(#rotation-relative-axis-arrow)"/>
<path d="M220 270H421" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.3"/>
<text x="421" y="291" font-size="12" text-anchor="end" fill="currentColor" opacity="0.62">q、k 的共同初始方向</text>
<path d="M220 270L365 202.4" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linecap="round" marker-end="url(#rotation-relative-green-arrow)"/>
<path d="M220 270L287.4 103.1" fill="none" stroke="#BA7517" stroke-width="3" stroke-linecap="round" marker-end="url(#rotation-relative-orange-arrow)"/>
<path d="M262 270A42 42 0 0 0 258.1 252.3" fill="none" stroke="#0F6E56" stroke-width="1.75" marker-end="url(#rotation-relative-green-arrow)"/>
<path d="M275 270A55 55 0 0 0 240.6 219" fill="none" stroke="#BA7517" stroke-width="1.75" marker-end="url(#rotation-relative-orange-arrow)"/>
<path d="M303.4 231.1A92 92 0 0 0 254.5 184.7" fill="none" stroke="#BA7517" stroke-width="3" stroke-linecap="round" marker-end="url(#rotation-relative-orange-arrow)"/>
<circle cx="220" cy="270" r="4.5" fill="currentColor"/>
<text x="208" y="289" font-size="12.5" fill="currentColor" opacity="0.72">原点</text>
<text x="374" y="202" font-size="14" font-weight="600" fill="#0F6E56">R(mθ)q</text>
<text x="273" y="90" font-size="14" font-weight="600" fill="#BA7517">R(nθ)k</text>
<text x="267" y="260" font-size="12.5" fill="#0F6E56">mθ</text>
<text x="245" y="221" font-size="12.5" fill="#BA7517">nθ</text>
<text x="300" y="186" font-size="14" font-weight="600" fill="#BA7517">(n−m)θ</text>
<rect x="454" y="88" width="190" height="112" rx="10" fill="currentColor" opacity="0.045"/>
<circle cx="474" cy="116" r="5" fill="#0F6E56"/>
<text x="489" y="121" font-size="13" fill="currentColor">位置 m：q 旋转 mθ</text>
<circle cx="474" cy="151" r="5" fill="#BA7517"/>
<text x="489" y="156" font-size="13" fill="currentColor">位置 n：k 旋转 nθ</text>
<text x="549" y="184" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.62">绝对角度各自不同</text>
<rect x="454" y="230" width="190" height="104" rx="10" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.75"/>
<text x="549" y="254" font-size="12.5" text-anchor="middle" fill="#085041">点积中的位置依赖</text>
<text x="549" y="282" font-size="17" font-weight="600" text-anchor="middle" fill="#04342C">m，n → n−m</text>
<text x="549" y="313" font-size="12" text-anchor="middle" fill="#085041">具体数值仍由 q、k 决定</text>
</svg>
</div>

若 $q$ 旋转角度 $m\theta$，$k$ 旋转角度 $n\theta$，则它们的点积为：

$$
(R(m\theta)q)^T(R(n\theta)k)
$$

利用转置性质：

$$
(R(m\theta)q)^T(R(n\theta)k)
= q^T R(m\theta)^T R(n\theta)k
$$

又因为：

$$
R(m\theta)^T = R(-m\theta)
$$

所以：

$$
q^T R(m\theta)^T R(n\theta)k
= q^T R(-m\theta)R(n\theta)k
= q^T R((n-m)\theta)k
$$

## 2. 相对位置自然出现

最终得到：

$$
(R(m\theta)q)^T(R(n\theta)k)
= q^T R((n-m)\theta)k
$$

这个结果非常关键：**点积不再分别依赖 $m$ 和 $n$，而是通过 $n-m$ 依赖二者的相对距离**。

这里的“只依赖相对位置”特指位置变量的进入方式；点积的具体数值仍由内容向量 $q,k$ 共同决定。

---

# 五、旋转矩阵与复数乘法

## 1. 二维旋转矩阵回顾

一个二维向量可以写成：

$$
\begin{bmatrix}
x \\
y
\end{bmatrix}
$$

绕原点逆时针旋转角度 $\theta$ 时，使用旋转矩阵：

$$
R(\theta)=
\begin{bmatrix}
\cos\theta & -\sin\theta \\
\sin\theta & \cos\theta
\end{bmatrix}
$$

因此：

$$
\begin{bmatrix}
x' \\
y'
\end{bmatrix}
=
R(\theta)
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
x\cos\theta-y\sin\theta \\
x\sin\theta+y\cos\theta
\end{bmatrix}
$$

这组公式后面会和复数乘法完全对应。

## 2. 复数背景知识

欧拉公式给出：

$$
e^{j\theta}=\cos\theta+j\sin\theta,\qquad j^2=-1
$$

一个复数 $z=x+jy$ 可以看作复平面上的点 $(x,y)$。它也可以写成**极坐标**形式：

$$
z=x+jy=r(\cos\theta+j\sin\theta)
$$

其中：

- $r=\sqrt{x^2+y^2}$：到原点的距离，也就是复数的模；
- $\theta=\operatorname{atan2}(y,x)$：与 $x$ 轴的夹角，也就是复数的辐角。

## 3. 复数相乘

设两个复数为：

$$
z_1=r_1(\cos\theta_1+j\sin\theta_1)
$$

$$
z_2=r_2(\cos\theta_2+j\sin\theta_2)
$$

根据三角恒等式，它们的乘积展开后可合并为：

$$
z_1z_2
=r_1r_2\left[\cos(\theta_1+\theta_2)+j\sin(\theta_1+\theta_2)\right]
$$

可以看到：

- 模相乘：$r_1r_2$；
- 角度相加：$\theta_1+\theta_2$。

特别地，如果第二个复数在单位圆上：

$$
z_2=e^{j\phi}=\cos\phi+j\sin\phi
$$

它的模为 $1$，不会改变长度。因此：

$$
z_1e^{j\phi}
=r_1\left[\cos(\theta_1+\phi)+j\sin(\theta_1+\phi)\right]
$$

根据极坐标定义，**这表示把 $z_1$ 绕原点旋转 $\phi$ 弧度**。

因此，**$e^{j\phi}$ 可以看作复平面上的旋转算子。**

## 4. 对应回矩阵形式

把二维向量 $(x,y)$ 写成复数 $z=x+jy$，再乘以单位复数 $e^{j\theta}$：

$$
\begin{aligned}
z'
&=z\cdot e^{j\theta} \\
&=(x+jy)(\cos\theta+j\sin\theta) \\
&=x\cos\theta+jx\sin\theta+jy\cos\theta+j^2y\sin\theta \\
&=(x\cos\theta-y\sin\theta)+j(x\sin\theta+y\cos\theta)
\end{aligned}
$$

所以实部和虚部分别是：

$$
\begin{cases}
x'=x\cos\theta-y\sin\theta \\
y'=x\sin\theta+y\cos\theta
\end{cases}
$$

写回矩阵形式，正好得到：

$$
\begin{bmatrix}
x' \\
y'
\end{bmatrix}
=
\begin{bmatrix}
\cos\theta & -\sin\theta \\
\sin\theta & \cos\theta
\end{bmatrix}
\begin{bmatrix}
x \\
y
\end{bmatrix}
$$

> **因此二维旋转既可以看作矩阵乘法，也可以看作复平面上乘以单位复数。**

---

# 六、高维向量中的分组旋转

## 1. 每两个维度一组

RoPE 面对的是高维向量，例如 $q,k \in \mathbb{R}^{d}$。它不会构造一个完整的 $d \times d$ 任意旋转矩阵，而是把相邻两个维度分成一组：

$$
(x_0,x_1),\ (x_2,x_3),\ \dots,\ (x_{d-2},x_{d-1})
$$

**每组单独进行二维旋转。**

## 2. 块对角矩阵

高维旋转可以写成块对角矩阵：

$$
R_{\Theta}(m)=
\begin{bmatrix}
R(m\theta_0) & 0 & \cdots & 0 \\
0 & R(m\theta_1) & \cdots & 0 \\
\vdots & \vdots & \ddots & \vdots \\
0 & 0 & \cdots & R(m\theta_{d/2-1})
\end{bmatrix}
$$

其中每个二维子空间有自己的频率 $\theta_i$。

以 $d=4$ 为例，向量 $x=(x_0,x_1,x_2,x_3)$ 按相邻两维分组为 $(x_0,x_1)$、$(x_2,x_3)$，块对角矩阵展开为：

$$
R_{\Theta}(m)x=
\begin{bmatrix}
\cos m\theta_0 & -\sin m\theta_0 & 0 & 0 \\
\sin m\theta_0 & \cos m\theta_0 & 0 & 0 \\
0 & 0 & \cos m\theta_1 & -\sin m\theta_1 \\
0 & 0 & \sin m\theta_1 & \cos m\theta_1
\end{bmatrix}
\begin{bmatrix}
x_0 \\ x_1 \\ x_2 \\ x_3
\end{bmatrix}
=
\begin{bmatrix}
x_0\cos m\theta_0-x_1\sin m\theta_0 \\
x_0\sin m\theta_0+x_1\cos m\theta_0 \\
x_2\cos m\theta_1-x_3\sin m\theta_1 \\
x_2\sin m\theta_1+x_3\cos m\theta_1
\end{bmatrix}
$$

可以看到，前两维只按频率 $\theta_0$ 旋转，后两维只按频率 $\theta_1$ 旋转，两组之间没有交叉项。**高维旋转本质上就是若干个二维旋转各自独立、并行进行。**

## 3. 为什么需要多个频率

$\theta_i$ 表示角度随位置 $m$ 变化的速率。但单一频率只能表达一种尺度的位置变化，多个频率相当于同时提供不同尺度的位置信号：

- 高频维度变化快，适合刻画局部位置差异；
- 低频维度变化慢，适合刻画较长距离关系。

这与 Sinusoidal 位置编码的多频率设计一脉相承（其频率构造可参见 [绝对位置编码](/blog/absolute-encoding)）。

---

# 七、总结

旋转矩阵有三个对 RoPE 极其重要的性质：**保持向量长度、旋转角度可加、不同位置旋转后的点积只依赖相对角度。**

特别是：

$$
(R(m\theta)q)^T(R(n\theta)k)=q^T R((n-m)\theta)k
$$

这说明只要让 query 和 key 根据各自位置旋转，注意力分数中就会自然出现相对位置 $n-m$。RoPE 正是把这个二维旋转结构扩展到高维 attention 表示中。

---

# 参考资料

1. [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
2. [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
