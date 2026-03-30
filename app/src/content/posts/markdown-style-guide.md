---
title: "博客 Markdown 样式"
date: "2025-01-01"
tags: ["Markdown", "排版"]
category: "工程知识"
excerpt: "展示博客系统支持的所有 Markdown 格式与样式，可作为撰写新文章的排版参考。"
---

本文展示博客系统支持的所有 Markdown 格式，撰写新文章时可对照参考。

---

# 一、标题

正文可以直接使用 `#` 作为一级标题，`##` 作为二级标题（虽然页面级标题会独占 `<h1>` 标签，但正文中的 `#` 等标题会被渲染器顺延下调一级转为 `<h2>` 等标签并适配字号，符合 SEO 规范且不影响写作习惯）。

## 这是三级标题（###）

---

# 二、文字样式

- **粗体**：`**粗体**`
- *斜体*：`*斜体*`
- ~~删除线~~：`~~删除线~~`
- **粗体与 *嵌套斜体* 组合**
- `行内代码`：`` `行内代码` ``

---

# 三、段落与换行

直接空一行即可产生新段落。

这是第二个段落。段落内的文字默认 `leading-relaxed` 行高，阅读体验舒适。

---

# 四、列表

## 无序列表

- 第一项
- 第二项
  - 嵌套子项 A
  - 嵌套子项 B
- 第三项

## 有序列表

1. 第一步：安装依赖
2. 第二步：启动开发服务器
3. 第三步：编写文章

## 任务列表（GFM）

- [x] 已完成的任务
- [ ] 未完成的任务
- [x] 又一个已完成的任务

---

# 五、引用块

> 这是一段引用。引用块会显示左侧竖线和斜体样式，适合摘引原文或标注重点结论。

> 引用也可以多行。
>
> 继续引用内容。

---

# 六、代码块

支持多种语言的语法高亮（基于 `highlight.js`，主题 `github-dark`）。

## Python

```python
import torch
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_dim: int, out_dim: int):
        super().__init__()
        self.fc = nn.Linear(in_dim, out_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.relu(self.fc(x))

model = MLP(128, 10)
print(model)
```

## TypeScript

```typescript
interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
}

const getLatest = (posts: Post[]): Post =>
  posts.sort((a, b) => b.date.localeCompare(a.date))[0];
```

## Bash

```bash
# 安装依赖并启动
cd personal_web/app
npm install
npm run dev
```

## JSON

```json
{
  "name": "my-app",
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  }
}
```

---

# 七、数学公式

基于 KaTeX 渲染，支持行内公式和块级公式。

## 行内公式

爱因斯坦的质能方程 $E = mc^2$ 中，$c$ 为光速，约为 $3 \times 10^8 \text{ m/s}$。

注意力机制的缩放点积为 $\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$。

## 块级公式

贝叶斯定理：

$$
P(A \mid B) = \frac{P(B \mid A)\, P(A)}{P(B)}
$$

高斯分布的概率密度函数：

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
$$

多元微积分中的梯度下降更新规则：

$$
\theta_{t+1} = \theta_t - \eta \nabla_{\theta} \mathcal{L}(\theta_t)
$$

矩阵求导链式法则（以 Softmax 为例）：

$$
\frac{\partial \ell}{\partial z_i} = \sum_j \frac{\partial \ell}{\partial p_j} \cdot p_j(\delta_{ij} - p_i)
$$

---

# 八、表格

支持 GFM 扩展表格，可设置对齐方式。

| 插件 | 功能 | 备注 |
|------|------|------|
| `remark-gfm` | GFM 扩展（表格、任务列表、删除线） | 默认启用 |
| `remark-math` | 解析 `$...$` 和 `$$...$$` | 配合 rehype-katex |
| `rehype-katex` | 将数学公式渲染为 HTML | 需引入 katex CSS |
| `rehype-highlight` | 代码块语法高亮 | 主题：github-dark |

## 带对齐的表格

| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| Apple  |   苹果   |    ¥5  |
| Banana |   香蕉   |    ¥3  |
| Cherry |   樱桃   |   ¥18  |

---

# 九、链接与图片

## 超链接

[访问 React 官网](https://react.dev)（在新标签页打开，带 `noopener noreferrer`）

## 图片

图片支持懒加载，`alt` 文字会作为图注显示在图片下方：

![来自 Unsplash 的示例图片：山脉风景](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80)

---

# 十、分割线

使用 `---` 插入分割线，渲染为 `<hr>`：

---

# 十一、可折叠块

使用 HTML 原生的 `<details>` / `<summary>` 标签实现，可在 Markdown 中直接书写：

<details>
<summary>点击展开：什么是 Transformer？</summary>

Transformer 是一种基于**自注意力机制**的深度学习架构，由 Vaswani 等人在 2017 年的论文 *Attention Is All You Need* 中提出。

核心公式：

$$
\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

它完全抛弃了 RNN 的顺序计算，支持并行训练，现已成为 NLP、CV 等领域的主流架构。

</details>

<details>
<summary>点击展开：折叠代码示例</summary>

```python
def attention(Q, K, V):
    import math
    d_k = Q.shape[-1]
    scores = Q @ K.T / math.sqrt(d_k)
    weights = softmax(scores)
    return weights @ V
```

</details>

<details>
<summary>点击展开：折叠表格示例</summary>

| 模型 | 参数量 | 发布年份 |
|------|--------|----------|
| GPT-2 | 1.5B | 2019 |
| GPT-3 | 175B | 2020 |
| LLaMA 2 | 70B | 2023 |

</details>

折叠块内支持所有 Markdown 语法，包括公式、代码块、表格等。注意 `<details>` 与内容之间需要**空一行**，否则内部 Markdown 可能不会被正确解析。

---

# 十二、注意事项

1. **随意使用 `#` 标题**：不用再避开一次标题啦！由于渲染层会自动适配级联下调（将 `#` 转为 `<h2>`，`##` 转为 `<h3>` 等），请放心从 `#` 起步写作。
2. **数学公式**：行内用 `$...$`，块级用 `$$...$$`，注意美元符号不要有多余空格
3. **代码块语言标识**：尽量写准确语言名（`python`、`typescript`、`bash` 等），否则无法高亮
4. **图片**：推荐使用外链 CDN，`alt` 会作为图注展示

---

# 参考资料

1. [CommonMark 规范](https://commonmark.org)
2. [GitHub Flavored Markdown 规范](https://github.github.com/gfm/)
3. [KaTeX 支持的函数列表](https://katex.org/docs/supported.html)
4. [highlight.js 支持的语言列表](https://highlightjs.org/static/demo/)
