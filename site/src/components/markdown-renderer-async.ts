import type { ComponentType } from 'react';

/**
 * 按需加载 Markdown 渲染栈（react-markdown + remark/rehype + KaTeX + highlight.js，
 * 合计约 233 KB gzip）。
 *
 * 线上正常情况下根本不会加载它：文章页直接打开时走预渲染 DOM 复用（lib/prerendered-article），
 * 站内切到别的文章时复用那篇的预渲染 HTML（lib/article-html）。只有三种情况需要它：
 * 开发环境（没有预渲染产物）、react-snap 预渲染时（正在生成那份 HTML），
 * 以及线上取不到预渲染 HTML 时的回退。
 *
 * 这里不用 React.lazy + Suspense，因为 Suspense 的 fallback 就是一次 loading 闪烁。
 * 改成「模块级缓存 + 同步取用」：已经加载过时渲染那一帧就能同步拿到组件。
 */

type MarkdownRendererComponent = ComponentType<{ content: string; className?: string }>;

let cached: MarkdownRendererComponent | null = null;
let inflight: Promise<MarkdownRendererComponent> | null = null;

/** 已经加载过就同步返回组件，否则返回 null（调用方需要先 load）。 */
export function getMarkdownRendererSync(): MarkdownRendererComponent | null {
  return cached;
}

/** 加载渲染栈。并发调用共享同一个请求；失败后允许重试。 */
export function loadMarkdownRenderer(): Promise<MarkdownRendererComponent> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = import('./MarkdownRenderer')
    .then((mod) => {
      cached = mod.MarkdownRenderer;
      inflight = null;
      return cached;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });

  return inflight;
}

/** 预热渲染栈，失败静默 —— 预取只是优化，真实渲染路径会自己处理错误。 */
export function prefetchMarkdownRenderer(): void {
  if (cached || inflight) return;
  void loadMarkdownRenderer().catch(() => {});
}
