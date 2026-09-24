/**
 * 正文根节点的 class 与标记属性。
 *
 * 单独成一个零依赖模块，而不是放在 MarkdownRenderer.tsx 里，原因是这两个常量的
 * 使用者散落在关键路径上：main.tsx → lib/prerendered-article.ts 需要用标记属性
 * 找到预渲染好的正文，BlogPost 复用那段 DOM 时也要拼出同样的根节点。
 * 如果它们还留在 MarkdownRenderer.tsx 里，入口文件就会顺着这条引用把
 * katex + highlight.js + remark 全套拖进主包（实测 186 KB gzip），
 * 而首页一个字都用不上。
 *
 * 首屏复用预渲染 DOM 要求两处生成完全一致的根节点，所以必须共用同一份定义，
 * 避免哪天改了 class 而另一处没跟上，导致 hydration 不匹配。
 */
export const markdownRootClass =
  'prose prose-sm prose-slate dark:prose-invert max-w-none text-[0.9rem] sm:text-[14.5px] md:text-[15px] lg:text-[15.5px]';

export const MARKDOWN_ROOT_ATTR = 'data-markdown-root';
