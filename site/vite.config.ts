import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [
    // inspectAttr 会给每个元素注入 code-path="源文件:行:列" 调试属性。
    // 只在 dev server 启用：否则它会进入线上产物，既让每张页面凭空多出十几 KB，
    // 也把源码路径和行号暴露在公开 HTML 里。
    ...(command === 'serve' ? [inspectAttr()] : []),
    react(),
  ],
  build: {
    target: 'es2018',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
