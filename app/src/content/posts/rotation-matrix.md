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

旋转矩阵只改变向量方向，不改变向量长度。若把 $x$ 看成从原点出发的箭头，$R(\theta)x$ 就是将这个箭头绕原点逆时针旋转 $\theta$ 后的位置。

> 旋转是一种保持几何结构的变换，它不会拉伸或压缩向量。

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

现在考虑两个向量 $q,k$。若 $q$ 旋转角度 $m\theta$，$k$ 旋转角度 $n\theta$，则它们的点积为：

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

> RoPE 的数学核心：如果 query 和 key 分别按自己的位置旋转，那么它们的注意力点积会自然包含相对位置信息。

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
