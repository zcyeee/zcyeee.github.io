# 博客长图导出

把站点上的任意一篇博客渲染成适合手机分享的竖版长图。渲染的是站点本身的页面，所以排版、配色、代码高亮、KaTeX 公式和 SVG 示意图与网页完全一致；切割只发生在段落之间，不会把段落、列表、代码块、表格或示意图截断。

每张图自带页脚条，左边是文章标题，右边是页码。

## 环境准备（只需一次）

- macOS + Node 20 以上，安装有 Google Chrome（也支持 Chromium / Edge，或用 `CHROME_PATH` 指定）
- `app/` 已执行过 `npm install`（脚本会调用其中的 vite 启动本地站点）
- 安装本工具依赖：

```bash
cd tools/share-image
npm install --registry=https://registry.npmjs.org
```

> 必须带 `--registry`：默认的腾讯镜像对 `puppeteer-core` 返回 403。

## 快速开始

```bash
cd tools/share-image
node render.mjs cc-memory
```

脚本会自动启动本地 dev server（端口 5180）、渲染、切图，然后关闭 server。如果该端口已有站点在跑就直接复用，不会重复启动。渲染一篇约 7 秒。

因为读的是本地站点，尚未发布的草稿一样可以导出。

```bash
node render.mjs --list          # 列出全部可渲染的 slug
node render.mjs --help          # 查看所有选项
```

## 选项

| 选项 | 说明 | 默认 |
|---|---|---|
| `--height <px>` | 每张图的目标高度（CSS px） | 840 |
| `--max-height <px>` | 单张高度上限 | 目标高度 × 1.2 |
| `--width <px>` | 版面宽度（CSS px），越大字越小 | 480 |
| `--scale <n>` | 像素密度，成图宽度 = width × scale | 3 |
| `--balance <n>` | 各页高度均衡权重，越大越平均 | 70 |
| `--theme <light\|dark>` | 主题 | light |
| `--out <dir>` | 输出目录 | `out/<slug>` |
| `--port <n>` | 自动启动 dev server 的端口 | 5180 |
| `--origin <url>` | 使用已运行的站点地址，跳过自动启动 | — |
| `--no-preview` | 不生成缩略图 | — |

## 调节图片长宽

只需要动两个参数：`--width` 决定宽度和字号，`--height` 决定每张多长。

| 想要的效果 | 命令 |
|---|---|
| 默认（1440px 宽，比例约 1.3–2.2:1） | `node render.mjs <slug>` |
| 每张更短、张数更多 | `node render.mjs <slug> --height 700` |
| 每张更长、张数更少 | `node render.mjs <slug> --height 1100` |
| 字更大（适合长辈/小屏） | `node render.mjs <slug> --width 420` |
| 画面更宽、字相对更小 | `node render.mjs <slug> --width 560` |

经验值：`--width 480 --scale 3` 得到 1440px 宽的成图，正文在手机上约等于 11–12px，示意图里的小字也还能看清；宽度低于 420 时 SVG 示意图会明显偏小，高于 560 时正文会偏小。如果某一张明显比其他张长，把 `--balance` 调到 90–120 会更平均，代价是切点可能落在不那么理想的位置。

## 输出

```
out/<slug>/
├── <slug>-01.png … <slug>-NN.png   # 分享用原图
└── preview/                        # 等比缩略图，仅用于快速翻看
```

分享请用外层原图。以 `cc-memory` 为例：12 张、每张 0.45–0.95MB、合计 8.6MB，微信、Telegram 直接发送不会超限。

## 切割规则

切割单位是渲染后文章的**顶层块元素**（一个段落、一个列表、一个代码块、一张表、一张示意图、一条分隔线、一个标题），所以物理上不可能从段落中间断开。在此基础上：

**禁止切的位置**

- 标题之后 —— 否则标题会孤零零留在上一张底部
- 以「：」结尾的句子之后 —— 它和下面的列表 / 代码块是一体的
- 分隔线之前 —— 横线应该收尾上一节，而不是出现在下一张顶部

**优先切的位置**（惩罚分，越低越优先）

| 位置 | 分数 |
|---|---|
| 分隔线之后（章节交界） | 0 |
| 一级标题之前 | 1 |
| 二级标题之前 | 3 |
| 三级标题之前 | 5 |
| 普通段落之间 | 9 |

最终用动态规划在所有合法切点里选一组，代价 = 高度偏离目标值的平方项 × `--balance` + 切点惩罚分 + 超过上限或过短的罚分。切点定下后，每个接缝会额外撑开 48px，让上下两张的边缘都不局促。

## 代码结构

| 文件 | 职责 |
|---|---|
| `render.mjs` | 命令行入口与整体流程：启动浏览器、测量、切图、输出 |
| `lib/dev-server.mjs` | 按需启动 / 复用 / 关闭本地 dev server |
| `lib/browser-page.mjs` | 在浏览器里执行的代码：清理页面、测量块位置、翻页 |
| `lib/split.mjs` | 纯算法：候选切点筛选 + 动态规划分页 |

想改**版面**（隐藏哪些元素、代码块与表格的样式、页脚条外观）改 `lib/browser-page.mjs` 的 `prepareForExport`；想改**切割策略**（禁止规则、惩罚分、代价函数）改 `lib/split.mjs`。

完整流程：打开文章页 → 滚动一遍触发入场动画并等字体就绪 → 清理站点外壳、把横向滚动的块改成自适应 → 测量所有顶层块的坐标 → 选切点 → 撑开接缝后重新测量 → 逐张把视口高度设成该页高度、滚到起点、截图。页脚条是固定定位的不透明条，正好盖住视口底部属于下一页的那一小段，所以不会出现重复内容。

## 常见问题

**端口被占用 / 想复用已有的 server**：`--port 5181` 换端口，或先手动起好站点再 `--origin http://localhost:5173`。

**`npm install` 报 403**：加 `--registry=https://registry.npmjs.org`。

**找不到 Chrome**：`CHROME_PATH="/path/to/Chrome" node render.mjs <slug>`。

**提示「第 N 张滚动被截断」**：页面底部占位不足，把 `lib/browser-page.mjs` 里 `#__share_spacer` 的高度调大即可。

**新写的文章渲染不出来**：确认 `app/src/content/posts/<slug>.md` 存在且 frontmatter 里有 `title` 和 `date`，再用 `--list` 核对 slug。

**只适用于 macOS**：缩略图用了系统自带的 `sips`，Chrome 路径也按 macOS 约定查找；在其他系统上加 `--no-preview` 并设置 `CHROME_PATH` 即可。
