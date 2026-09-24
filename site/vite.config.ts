import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { markdownFrontmatter } from './plugins/markdown-frontmatter'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [
    // inspectAttr 会给每个元素注入 code-path="源文件:行:列" 调试属性。
    // 只在 dev server 启用：否则它会进入线上产物，既让每张页面凭空多出十几 KB，
    // 也把源码路径和行号暴露在公开 HTML 里。
    ...(command === 'serve' ? [inspectAttr()] : []),
    markdownFrontmatter(),
    react(),
  ],
  build: {
    target: 'es2018',
    // 刻意不写 manualChunks。Markdown 渲染栈（react-markdown + remark/rehype +
    // KaTeX + highlight.js）的分离完全靠 markdown-renderer-async.ts 里那个
    // 动态 import 边界，Rollup 会自动把「只有它用得到」的模块收进异步块，
    // 共享模块（React 等）仍留在常驻块里。
    //
    // 试过手工 manualChunks 给渲染栈命名，结果更糟：Rollup 为了让每个模块只属于
    // 一个块，会把共享依赖塞进被命名的那个块，常驻块反过来静态 import 它，
    // Vite 随即生成 modulepreload —— 首屏照旧要下 400KB，分包完全白做。
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
