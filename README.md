# 个人网站

一个简洁、专业的个人网站，包含个人信息展示、技术博客和摄影作品展示。基于 React 19 + TypeScript + Vite 构建，支持部署到 GitHub Pages。

## 在线预览

🌐 网站地址：[https://zcyeee.github.io](https://zcyeee.github.io)

---

## 功能特性


| 模块       | 说明                               |
| -------- | -------------------------------- |
| 🏠 个人主页  | 自我介绍、教育经历、实习经历、项目展示、荣誉奖项         |
| 📝 博客文章  | 分类浏览、标题/摘要/标签搜索、数学公式（KaTeX）、代码高亮 |
| 🗂️ 文章归档 | 按年月时间线浏览、分类统计、无限滚动加载             |
| 📷 摄影展示  | 响应式分栏瀑布流、分类筛选、悬浮信息卡片             |


---

## 技术栈


| 技术             | 版本   | 说明                   |
| -------------- | ---- | -------------------- |
| React          | 19   | 前端框架                 |
| TypeScript     | ~5.9 | 类型安全                 |
| Vite           | 7    | 构建工具                 |
| Tailwind CSS   | 3    | 样式框架                 |
| shadcn/ui      | —    | UI 组件库（Radix UI 封装）  |
| React Router   | 7    | 客户端路由（BrowserRouter） |
| Framer Motion  | 12   | 动画效果                 |
| KaTeX          | 0.16 | 数学公式渲染               |
| react-markdown | 10   | Markdown 渲染          |
| react-snap     | 1.23 | 构建后预渲染（SSG）          |


---



## 项目结构

```
zcyeee.github.io/      # 项目根目录
├── site/              # 站点本体（Vite 项目）
│   ├── src/
│   │   ├── components/            # 可复用组件
│   │   │   ├── ui/                # shadcn/ui 基础组件（Button、Dialog 等）
│   │   │   ├── Layout.tsx         # 全局页面布局（导航栏 + 页脚）
│   │   │   ├── AnimatedSection.tsx# 滚动触发动画容器
│   │   │   ├── MarkdownRenderer.tsx # Markdown / KaTeX / 代码高亮渲染器（开发环境与回退路径使用）
│   │   │   ├── markdown-renderer-async.ts # 渲染栈的懒加载与同步缓存
│   │   │   └── markdown-root.ts   # 正文根节点的 class / 标记（零依赖，供入口复用）
│   │   │
│   │   ├── pages/                 # 页面级组件（对应路由）
│   │   │   ├── Home.tsx           # 首页（个人信息）
│   │   │   ├── Blog.tsx           # 博客列表 + 搜索 + 分类筛选
│   │   │   ├── BlogPost.tsx       # 博客详情页
│   │   │   ├── Archive.tsx        # 归档页（时间线 + 统计）
│   │   │   └── Gallery.tsx        # 摄影展示页
│   │   │
│   │   ├── content/
│   │   │   ├── posts/             # 博客文章目录（Markdown 文件）
│   │   │   │   └── *.md           # 博客文章（每篇一个文件）
│   │   │   ├── posts-loader.ts    # 两层加载器（元数据 eager + 正文按篇 lazy）
│   │   │   └── frontmatter.ts     # frontmatter 解析与 readTime（插件与浏览器共用）
│   │   │
│   │   ├── data/                  # 静态数据配置（内容与代码分离）
│   │   │   ├── profile.ts         # 个人信息、教育、实习、项目、奖项
│   │   │   ├── blog.ts            # 博客分类定义（macroTags / CATEGORIES）
│   │   │   ├── gallery.ts         # 摄影照片数据
│   │   │   └── siteConfig.ts      # 网站全局配置（导航、页脚链接等）
│   │   │
│   │   ├── hooks/                 # 自定义 React Hooks
│   │   ├── lib/                   # 工具函数与运行时策略
│   │   │   ├── prerendered-article.ts # 首屏复用预渲染正文 DOM
│   │   │   ├── article-html.ts    # 站内切换文章时复用目标文章的预渲染 HTML
│   │   │   ├── extract-markdown-root.ts # 从页面源码中取出正文 HTML（零依赖）
│   │   │   ├── prefetch-posts.ts  # 文章链接的视口 / 意图预取
│   │   │   └── prerender.ts       # 识别 react-snap 预渲染环境
│   │   ├── types/                 # TypeScript 类型定义
│   │   ├── App.tsx                # 路由配置入口
│   │   ├── main.tsx               # React 渲染入口
│   │   └── index.css              # 全局样式 + CSS 变量（主题 Token）
│   │
│   ├── plugins/                   # 构建期 Vite 插件
│   │   └── markdown-frontmatter.ts # 处理 *.md?frontmatter，只产出元数据
│   ├── scripts/                   # 构建后处理（在 react-snap 之后执行）
│   │   ├── tune-prerendered-assets.mjs # 摘掉快照里多余的 modulepreload
│   │   └── generate-seo-files.mjs # 生成 sitemap / robots / rss
│   ├── public/                    # 静态资源（直接复制到构建输出）
│   ├── index.html                 # HTML 模板
│   ├── vite.config.ts             # Vite 配置
│   ├── tailwind.config.js         # Tailwind 配置
│   └── package.json               # 站点自身的依赖与脚本
│
├── tools/                         # 离线工具（独立安装依赖，不参与站点构建）
│   └── share-image/               # 将文章渲染为分享长图，用法见其 README
│
├── .github/workflows/deploy.yml   # GitHub Pages 自动部署工作流
├── package.json                   # 根级代理脚本（本身无依赖，仅转发到 site/ 与 tools/）
└── README.md                      # 本文件
```

仓库内有两个互相独立的 npm 包：`site/`（站点）和 `tools/share-image/`（离线工具），各自维护 `package.json` 与 `node_modules`。
根目录的 `package.json` 不声明任何依赖，只提供转发脚本，这样在根目录敲 `npm run dev` 能正确工作，
也避免误在根目录执行 `npm install` 时生成一棵无主的 `node_modules`。

---



## 快速开始



### 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`



### 安装与启动

在仓库根目录即可完成日常操作，根级脚本会自动转发到 `site/`：

```bash
# 安装站点依赖
npm run install:site

# 启动开发服务器
npm run dev
```

也可以照旧进入 `site/` 目录直接操作，两种方式等价：

```bash
cd site && npm install && npm run dev
```

根目录可用的脚本：


| 命令                                           | 作用                                |
| -------------------------------------------- | --------------------------------- |
| `npm run dev` / `build` / `preview` / `lint` | 转发到 `site/` 的同名脚本                 |
| `npm run install:site` / `install:tools`     | 分别安装站点与离线工具的依赖                    |
| `npm run share -- <slug> [选项]`               | 生成文章分享长图（转发到 `tools/share-image`） |
| `npm run share:list`                         | 列出所有可渲染的文章 slug                   |




### 构建生产版本

```bash
npm run build
```

当前构建流程会执行：

1. `tsc -b && vite build`
2. `react-snap` 预渲染（由 `postbuild` 自动触发）
3. `scripts/generate-seo-files.mjs` 生成 sitemap / robots / RSS（同属 `postbuild`）

最终产物位于 `site/dist/`，并包含：

- 常规静态资源：`assets/*`
- 预渲染页面：`/`、`/blog`、`/blog/<slug>`、`/archive`、`/gallery`
- 兼容回退页：`404.html`、`200.html`
- 站点地图与订阅源：`sitemap.xml`、`robots.txt`、`rss.xml`

> 每个页面的 `title` / `description` / Open Graph 由 `src/hooks/use-seo.ts` 在运行时写入
> `document.head`，react-snap 拍快照时会把它们固化进各自的静态 HTML。新增页面时记得调用 `useSeo()`。
>
> `scripts/generate-seo-files.mjs` 独立解析 `src/content/posts/*.md` 的 frontmatter，
> 站点地址等常量与 `src/data/siteConfig.ts` 重复了一份，改动时两边需同步。



### 代码质量检查

```bash
npm run lint
```

---



## 如何更新内容



### 修改个人信息

编辑 `src/data/profile.ts`，数据结构包含：

- `personalInfo` — 姓名、简介、联系方式、头像
- `education` — 教育经历列表
- `experiences` — 实习 / 工作经历列表
- `projects` — 项目经历列表
- `awards` — 荣誉奖项列表
- `skills` — 技能要点列表
- `research` — 论文与研究成果



### 修改导航 / 页脚

编辑 `src/data/siteConfig.ts`。

### 添加 / 修改照片

编辑 `src/data/gallery.ts`，每张照片格式：

```typescript
{
  id: "唯一 ID",
  src: "图片 URL",
  title: "图片标题",
  location: "拍摄地点",
  date: "2024-01",
  camera: "相机型号",
  category: "风光",      // 与筛选分类对应
  width: 1200,
  height: 800
}
```

---



## 博客撰写规范



### 文件命名

- 存放路径：`src/content/posts/`
- 文件名格式：**英文 slug +** `.md`，单词之间用连字符分隔
- 示例：`rope-position-embedding.md`、`rag-system-design.md`
- slug 即为该文章的 URL 路径（`/blog/<slug>`），发布后**尽量不要修改文件名**（改名技术上没问题，但会导致已被收藏或被外部链接引用的旧 URL 失效）



### Frontmatter 模板

每篇文章必须以 YAML Frontmatter 开头：

```markdown
---
title: "文章标题"
date: "2026-01-15"
readTime: "10 分钟"
tags: ["Tag1", "Tag2"]
category: "工程知识"
excerpt: "一句话摘要，显示在文章卡片上。"
---

正文内容从这里开始……
```



### Frontmatter 字段说明


| 字段         | 是否必填 | 说明                   |
| ---------- | ---- | -------------------- |
| `title`    | ✅ 必填 | 文章标题                 |
| `date`     | ✅ 必填 | 发布日期，格式 `YYYY-MM-DD` |
| `readTime` | 推荐   | 预计阅读时长，如 `"10 分钟"`   |
| `tags`     | 推荐   | 细粒度标签，数组格式           |
| `category` | 推荐   | 必须是下方已定义分类之一         |
| `excerpt`  | 推荐   | 摘要，显示在列表卡片，不超过 80 字  |




### 博客分类（category）

分类须与 `src/data/blog.ts` 中的 `macroTags` 保持一致：


| 分类名   | 适用内容          |
| ----- | ------------- |
| 论文阅读  | 经典 / 前沿论文系统梳理 |
| 大语言模型 | 大模型训练与应用实践    |
| 强化学习  | RL 算法原理与实践    |
| 数学基础  | 概率论、线性代数、优化等  |
| 深度学习  | 模型结构与训练技巧     |
| 机器学习  | 监督学习与非监督方法    |
| 工程知识  | 开发工具、最佳实践等    |
| 日常随笔  | 日常记录与思考       |


> 若需新增分类，同步在 `src/data/blog.ts` 的 `macroTags` 数组中添加。



### 正文规范

1. **标题层级**：可直接使用 `#` / `##` / `###`；渲染器会自动下调一级标题层级以避免与页面主标题冲突
2. **数学公式**：行内公式使用 `$...$`，块级公式使用 `$$...$$`（基于 KaTeX）
3. **代码块**：带语言标识符，如 ````python`，支持高亮
4. **图片**：优先使用外链 CDN（图床），避免将大图放入仓库
5. **参考资料**：建议在文末以列表形式列出



### 渲染与加载机制

当前博客采用「**SSG 预渲染 + 客户端 Hydration + Markdown 分层加载**」：

- **构建阶段（SSG）**：`react-snap` 会抓取站内路由并输出对应静态 HTML，提升首屏可见性与收录友好度
- **接管阶段（Hydration）**：浏览器加载 JS 后对预渲染 HTML 进行接管，保留现有交互与动画效果
  - 文章页首屏直接复用预渲染好的正文 DOM，跳过 Markdown / KaTeX / 高亮的重算
  - 导航栏与首页 hero 的入场动画由 `index.html` 里的内联脚本按住，等第一次渲染帧再起跑
    （WebKit 会在解析途中就启动动画时钟，不按住的话在 iPhone 上会被吃掉）
  - hydration 首帧必须与快照一致，否则 React 会丢掉整棵预渲染 DOM 重画（手机上阻塞一秒以上）：
    - 快照按路径拍、不带查询参数，依赖 `?page=` / `?from=` 的渲染一律经 `useHydrationSafeSearchParams`，首帧视为无参数
    - react-snap 的 `minifyHtml` 保持关闭：html-minifier 无论怎么配置都会改写 `class` 里的空白
    - 快照在 `<html data-prerender-route>` 记下自己的路径；与当前地址不符（如 404 页被用于不存在的文章）时改为客户端渲染
    - react-snap 自带 Chromium 78，不认识的 CSS 属性（如 `aspect-ratio`）写在内联样式里会从快照中丢失，改用 CSS 变量传值
- **站内切换文章**：直接拉取目标文章的预渲染 HTML（压缩后 8–48 KB），取出正文按同样方式渲染，
  与直接打开逐字节一致；链接在视口停留或被 hover / touch 时预取，真正点开某篇时其余预取让出带宽。
  正文未到时最多保留当前页面 600ms
- **内容阶段（Markdown）**：
  - Frontmatter 由 `*.md?frontmatter` 在构建期产出元数据（含算好的 `readTime`）供列表与归档使用
  - 正文按篇分包；Markdown 渲染栈（react-markdown / KaTeX / highlight.js）是独立异步块。
    线上正常情况下两者都不会被加载，只用于开发环境、react-snap 预渲染，以及取不到预渲染 HTML 时的回退

这样安排的原因是，渲染栈与文章正文首页一个字都用不上，却曾占主包约六成体积；站内切换时现场排版公式，
在手机上既要先下载 233 KB 的渲染栈，又是几秒的主线程阻塞。相关权衡都写在对应文件的注释里，改动前建议先读。



### 发布新文章步骤

1. 在 `src/content/posts/` 下新建 `your-slug.md`
2. 填写 Frontmatter（参照上方模板）
3. 编写正文
4. 提交并推送代码 → GitHub Actions 自动构建部署

---



## 部署到 GitHub Pages



### 第一步：创建 GitHub 仓库

在 GitHub 创建新仓库，推荐命名为：

- **用户页面**（访问 `https://<username>.github.io`）：仓库名 `<username>.github.io`
- **项目页面**（访问 `https://<username>.github.io/<repo>`）：任意仓库名



### 第二步：配置 vite.config.ts

```typescript
// site/vite.config.ts
export default defineConfig({
  // 用户页面：base: '/'
  // 项目页面：base: '/your-repo-name/'
  base: '/',
  // ...其余配置保持不变
});
```

> ⚠️ 当前仓库配置为 `base: '/'`，适用于用户主页（`<username>.github.io`）。若改为项目主页（`<username>.github.io/<repo>`），需将 `base` 改为 `'/<repo>/'`。



### 第三步：检查 GitHub Actions 工作流

本仓库已包含 `.github/workflows/deploy.yml`，如需新建可参考以下内容：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: site/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: site

      - name: Build
        run: npm run build
        working-directory: site

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './site/dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```



### 第四步：开启 GitHub Pages

进入仓库 **Settings → Pages**：

- **Source**：选择 `GitHub Actions`
- 保存后等待第一次工作流执行完毕



### 第五步：推送代码

```bash
cd zcyeee.github.io

git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

推送后 GitHub Actions 会自动构建并部署，约 1-2 分钟后即可访问。

### 使用自定义域名（可选）

1. 在 `site/public/` 目录下创建 `CNAME` 文件，内容为你的域名：
  ```
   yourdomain.com
  ```
2. 在域名服务商处添加 DNS 记录：

  | 主机记录        | 类型    | 记录值                    |
  | ----------- | ----- | ---------------------- |
  | `@` 或 `www` | CNAME | `<username>.github.io` |

3. 在仓库 **Settings → Pages** 中填入自定义域名并勾选 **Enforce HTTPS**。

---



## 常见问题

**Q：页面刷新后出现 404？**

A：项目当前已使用 BrowserRouter（无 `#` 链接）并在 GitHub Pages 上做了回退处理：

- `public/404.html` 负责记录原始路径并回跳入口
- `index.html` 会读取并恢复目标路径
- 构建后还会生成 `200.html` 作为预渲染回退文件

如果你改动了路由或部署根路径（`base`），请同步检查这两处逻辑。

**Q：如何修改导航菜单？**

A：编辑 `src/data/siteConfig.ts` 中的导航配置。

**Q：如何添加新页面？**

A：在 `src/pages/` 创建组件，然后在 `src/App.tsx` 中注册路由。

**Q：如何修改网站配色？**

A：编辑 `src/index.css` 中的 CSS 变量（`:root` 块），所有颜色、圆角、字体均由 CSS Token 统一控制。

---



## 许可证

MIT License