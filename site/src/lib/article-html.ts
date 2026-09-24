import { extractMarkdownRootHtml } from '@/lib/extract-markdown-root';
import { isReactSnapPrerender } from '@/lib/prerender';

/**
 * 站内切换到另一篇文章时，直接复用那篇文章预渲染好的正文 HTML。
 *
 * 以前的做法是下载那篇的 Markdown 原文，再加载 Markdown 渲染栈（react-markdown +
 * remark/rehype + KaTeX + highlight.js，约 233 KB gzip）在浏览器里重新排版一遍。
 * 这有两个问题：
 *   - 慢网络下渲染栈要好几秒才能到，点开文章会看到很长的 loading 占位；
 *   - 公式多的文章在手机上重新排版本身就是几秒的主线程阻塞。
 * 而构建时 react-snap 早就把每篇文章排好版存成了静态 HTML（压缩后 8–45 KB），
 * 首屏直接打开时走的也正是这份 DOM（见 lib/prerendered-article）。站内切换拿同一份来用，
 * 渲染结果与直接打开逐字节一致，也彻底不需要渲染栈。
 *
 * 取不到时（开发环境没有预渲染产物、离线、页面结构变了）返回 null，
 * 调用方退回 Markdown 渲染，行为与以前相同。
 */

const ready = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
/**
 * 内存里最多留几篇。公式多的文章单篇正文就有几百 KB，手机上不能无限攒；
 * 被挤掉的再打开时会重新请求，通常直接命中 HTTP 缓存。
 */
const MAX_CACHED_ARTICLES = 8;
/**
 * 正在显示的那篇，淘汰时跳过。BlogPost 每次渲染都要经 getArticleHtmlSync 重新读它：
 * 读长文期间预取进来的文章一多，它若被挤出缓存，之后任何一次重渲染（比如点脚注、
 * 标题锚点）都读不到正文，只能重新请求 —— HTTP 缓存过期时正文会被 loading 顶掉。
 */
let pinned: string | null = null;
/**
 * 投机预取（视口 / hover）的请求。用户真正打开某篇时其余的全部取消，
 * 并且在那篇下载完之前不再发起新的预取：慢网络下带宽要全部留给用户在等的那篇。
 */
const speculative = new Map<string, AbortController>();
const opening = new Set<string>();
/** 绝对地址 → 该样式表加载完成（或失败、或超时）的 Promise */
const styleLoads = new Map<string, Promise<void>>();

/** 样式表迟迟不来时最多等这么久，宁可正文先出来，也不要让 loading 一直转 */
const STYLE_WAIT_LIMIT_MS = 3000;
const STYLESHEET_LINK = /<link\b[^>]*\brel="stylesheet"[^>]*>/gi;
const HREF = /\bhref="([^"]+)"/i;

/** 开发环境没有预渲染 HTML；react-snap 预渲染时正是在生成这份 HTML，这两种情况只能走 Markdown 渲染 */
export function canReuseArticleHtml(): boolean {
  return !import.meta.env.DEV && !isReactSnapPrerender();
}

function articleUrl(slug: string): string {
  // 带结尾斜杠：GitHub Pages 对不带斜杠的目录地址会先 301 一次，多一个往返
  return `${import.meta.env.BASE_URL}blog/${encodeURIComponent(slug)}/`;
}

/**
 * 保证文章页引用的样式表在当前文档里生效。KaTeX 与代码高亮的样式跟着渲染栈异步块走，
 * 从列表页切过来时当前文档里还没有。这些规则都挂在 .katex / .hljs 等类名上，
 * 提前加到列表页不会影响列表页本身的样子。
 */
function ensureStylesheet(href: string): Promise<void> {
  const absolute = new URL(href, window.location.href).href;
  const known = styleLoads.get(absolute);
  if (known) return known;

  const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).find(
    (l) => l.href === absolute
  );
  let loaded: Promise<void>;
  if (existing?.sheet) {
    loaded = Promise.resolve();
  } else {
    const link = existing ?? document.createElement('link');
    loaded = new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
      window.setTimeout(resolve, STYLE_WAIT_LIMIT_MS);
    });
    if (!existing) {
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = href;
      document.head.appendChild(link);
    }
  }
  styleLoads.set(absolute, loaded);
  return loaded;
}

function collectStylesheets(page: string): string[] {
  const headEnd = page.indexOf('</head>');
  const head = headEnd === -1 ? page : page.slice(0, headEnd);
  const hrefs: string[] = [];
  for (const tag of head.match(STYLESHEET_LINK) ?? []) {
    const href = HREF.exec(tag)?.[1];
    if (href) hrefs.push(href);
  }
  return hrefs;
}

/**
 * 同步取用：正文已经取到、它需要的样式表也已就绪时返回 HTML，否则返回 null。
 * BlogPost 渲染的第一帧就靠它判断能不能直接出正文、而不经过 loading 占位。
 */
export function getArticleHtmlSync(slug: string): string | null {
  pinned = slug;
  const html = ready.get(slug);
  if (html === undefined) return null;
  ready.delete(slug);
  ready.set(slug, html);
  return html;
}

/** 放进缓存。首屏直接打开的那篇也从这里登记（见 lib/prerendered-article），回到它时不必重新请求 */
export function rememberArticleHtml(slug: string, html: string): void {
  ready.delete(slug);
  ready.set(slug, html);
  for (const key of ready.keys()) {
    if (ready.size <= MAX_CACHED_ARTICLES) break;
    if (key !== pinned) ready.delete(key);
  }
}

function requestArticleHtml(slug: string, signal?: AbortSignal): Promise<string | null> {
  const cached = ready.get(slug);
  if (cached !== undefined) return Promise.resolve(cached);
  const existing = inflight.get(slug);
  if (existing) return existing;

  const task = (async (): Promise<string | null> => {
    try {
      const res = await fetch(articleUrl(slug), { credentials: 'same-origin', signal });
      if (!res.ok) return null;
      const page = await res.text();
      const html = extractMarkdownRootHtml(page);
      if (html === null) return null;
      await Promise.all(collectStylesheets(page).map(ensureStylesheet));
      rememberArticleHtml(slug, html);
      return html;
    } catch {
      return null;
    } finally {
      inflight.delete(slug);
      speculative.delete(slug);
    }
  })();

  inflight.set(slug, task);
  return task;
}

/** 取某篇文章的正文 HTML，并备好它需要的样式表。用于真正要打开这篇时；并发调用共享同一次请求。 */
export function loadArticleHtml(slug: string): Promise<string | null> {
  const cached = ready.get(slug);
  if (cached !== undefined) return Promise.resolve(cached);

  // 这篇若正作为预取在下载，就地转正，不再参与取消
  speculative.delete(slug);
  for (const controller of speculative.values()) controller.abort();
  speculative.clear();

  opening.add(slug);
  const task = requestArticleHtml(slug);
  void task.then(() => opening.delete(slug));
  return task;
}

/**
 * 站内切换时，正文没到之前最多保留当前页面这么久。
 *
 * React Router 的每次导航都包在 startTransition 里：BlogPost 挂起时 React 会继续显示
 * 当前页面，等新页面准备好再一次性切过去，不会先闪一下 loading。但不能无限等下去，
 * 慢网络下那样会像点了没反应；超过这个时长就进入文章页并显示 loading，
 * 那时它是真正有意义的加载提示，而不是一闪而过。
 */
const NAVIGATION_HOLD_MS = 600;
const holds = new Map<string, Promise<void>>();

/**
 * 给 BlogPost 用 `use()` 挂起的 Promise：正文就绪或等满 NAVIGATION_HOLD_MS 即兑现。
 * 必须按 slug 缓存同一个实例：React 在 Promise 兑现后重新渲染时要拿到同一个对象，
 * 才能同步读到「已兑现」而不再次挂起；否则超时就失去意义，会一直等到正文到达。
 */
export function waitForArticleHtml(slug: string): Promise<void> {
  let hold = holds.get(slug);
  if (!hold) {
    hold = Promise.race([
      loadArticleHtml(slug).then(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, NAVIGATION_HOLD_MS)),
    ]);
    holds.set(slug, hold);
  }
  return hold;
}

/**
 * 预取：失败静默，真正打开时会再走一次 loadArticleHtml，由那条路径决定是否回退。
 * 返回是否真的发起了请求（已缓存、已在下载、或正给真实打开让路时都不发）。
 */
export function prefetchArticleHtml(slug: string): boolean {
  if (!canReuseArticleHtml() || ready.has(slug) || inflight.has(slug) || opening.size > 0) return false;
  const controller = new AbortController();
  speculative.set(slug, controller);
  void requestArticleHtml(slug, controller.signal);
  return true;
}
