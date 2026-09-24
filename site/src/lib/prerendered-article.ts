import { MARKDOWN_ROOT_ATTR } from '@/components/markdown-root';
import { rememberArticleHtml } from '@/lib/article-html';

/**
 * 首屏复用预渲染的正文 DOM。
 *
 * 预渲染出来的文章页里，正文已经是最终的 DOM —— Markdown 解析、KaTeX 公式、代码高亮
 * 全部完成。但 hydration 默认会把这一整套重算一遍去生成「一模一样」的节点，纯属浪费：
 * 低端手机上实测 ppo-gradient（20761 个节点、187 个公式）为此冻结主线程 1846ms，
 * 其中只有约 196ms 是 bundle 解析，其余都是这次重算。
 *
 * 做法是在 hydrateRoot 之前把正文的 innerHTML 取出来，首屏用 dangerouslySetInnerHTML
 * 渲染同一个根节点。React 对 dangerouslySetInnerHTML 的子树不做 hydration，于是整套
 * 重算被跳过，而 DOM 逐字节不变，视觉上不可能有任何差异。
 *
 * 正文内没有任何 React 交互（链接是静态属性，折叠块是原生 details/summary），
 * 主题切换也由 CSS 的 dark: 变体负责，所以静态化不损失任何行为。
 */
export interface PrerenderedArticle {
    /** 这份正文属于哪篇文章。BlogPost 在站内切换时不会重新挂载，必须按 slug 核对后才能用 */
    slug: string;
    html: string;
}

let captured: PrerenderedArticle | null = null;

/** 必须在 hydrateRoot 之前调用，此时 DOM 还是预渲染产物。 */
export function capturePrerenderedArticle(): void {
    if (typeof document === 'undefined') return;
    const root = document.querySelector(`[${MARKDOWN_ROOT_ATTR}]`);
    const slug = window.location.pathname.match(/\/blog\/([^/]+)\/?$/)?.[1];
    captured = root && slug ? { slug: decodeURIComponent(slug), html: root.innerHTML } : null;
    // 离开后再回到这篇（返回列表再后退、从相关文章点回来）时直接用这份，不必重新请求
    if (captured) rememberArticleHtml(captured.slug, captured.html);
}

/**
 * 取出并清空。只有首屏那一次渲染能拿到；之后的客户端路由切换没有可复用的 DOM，
 * 会改走 lib/article-html。
 */
export function consumePrerenderedArticle(): PrerenderedArticle | null {
    const article = captured;
    captured = null;
    return article;
}
