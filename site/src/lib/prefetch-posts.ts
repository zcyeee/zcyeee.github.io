import { prefetchPostContent } from '@/content/posts-loader';
import { prefetchMarkdownRenderer } from '@/components/markdown-renderer-async';
import { canReuseArticleHtml, prefetchArticleHtml } from '@/lib/article-html';
import { isReactSnapPrerender } from '@/lib/prerender';

/**
 * 站内点开一篇文章时，正文要现取（线上取那篇的预渲染 HTML，见 lib/article-html；
 * 开发环境取 Markdown 原文并加载渲染栈）。如果等到点击那一刻才开始下载，BlogPost
 * 这一帧拿不到内容，就会先渲染 loading 占位，内容到了再换回来。
 *
 * 所以把下载提前到「用户表现出意图」的时刻：
 *   - 链接在视口里停留一小会儿后排队预取（快速滚过的不算，每个页面有上限）；
 *   - hover / touch / 聚焦时立即插队。
 *
 * 用一个文档级委托监听覆盖全站所有文章链接，页面组件不需要任何改动。
 */

const PREFETCHED = new Set<string>();
/** 视口预取的并发上限，避免同时开跑抢带宽 */
const MAX_CONCURRENT_VIEWPORT_PREFETCH = 3;
/** 链接在视口里停留这么久才算「可能会点」，快速滚动经过的不预取 */
const VIEWPORT_DWELL_MS = 200;
/**
 * 每个页面最多因为「出现在视口里」而预取几篇。归档页一屏能滚过全部文章，
 * 不设上限就等于替用户把整站下载一遍；hover / touch 触发的预取不受这个限制。
 */
const VIEWPORT_BUDGET_PER_PAGE = 6;

let viewportInflight = 0;
let viewportBudget = VIEWPORT_BUDGET_PER_PAGE;
const viewportQueue: string[] = [];
const dwellTimers = new Map<Element, number>();

let installed = false;
let observer: IntersectionObserver | null = null;
const observedLinks = new WeakSet<Element>();

/** 省流量模式或 2G 下不做投机预取：猜错的代价由用户的流量承担 */
function shouldSkipSpeculativePrefetch(): boolean {
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}

function slugFromHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const match = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * 预取打开这篇文章所需的一切。线上只要那篇的预渲染 HTML；开发环境没有预渲染产物，
 * 取 Markdown 原文，并在用户表现出明确意图时顺带加载渲染栈（视口预取不加载：
 * 那是几百毫秒的长任务，滚动时触发会直接掉帧）。
 * 返回是否真的发起了下载。
 */
function prefetchForNavigation(slug: string, { intent }: { intent: boolean }): boolean {
  if (canReuseArticleHtml()) return prefetchArticleHtml(slug);
  if (intent) prefetchMarkdownRenderer();
  prefetchPostContent(slug);
  return true;
}

function drainViewportQueue(): void {
  while (viewportInflight < MAX_CONCURRENT_VIEWPORT_PREFETCH && viewportQueue.length > 0 && viewportBudget > 0) {
    const slug = viewportQueue.shift();
    if (!slug || PREFETCHED.has(slug)) continue;
    PREFETCHED.add(slug);
    // 已在缓存里、或正给用户点开的那篇让路时不会发请求，不占这一页的额度
    if (!prefetchForNavigation(slug, { intent: false })) continue;
    viewportBudget -= 1;
    viewportInflight += 1;
    // 没有可靠的完成回调（可能已在缓存里），用一个短延时释放名额即可，这里只是限速
    window.setTimeout(() => {
      viewportInflight -= 1;
      drainViewportQueue();
    }, 300);
  }
}

/** hover / touch / 聚焦：用户马上就要点了，直接插队 */
function onIntent(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[href]');
  if (!link) return;
  const slug = slugFromHref(link.getAttribute('href') ?? '');
  if (!slug) return;
  PREFETCHED.add(slug);
  prefetchForNavigation(slug, { intent: true });
}

function ensureObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (!entry.isIntersecting) {
          const timer = dwellTimers.get(el);
          if (timer !== undefined) window.clearTimeout(timer);
          dwellTimers.delete(el);
          continue;
        }
        if (dwellTimers.has(el)) continue;
        dwellTimers.set(
          el,
          window.setTimeout(() => {
            dwellTimers.delete(el);
            observer?.unobserve(el);
            const slug = slugFromHref(el.getAttribute('href') ?? '');
            if (!slug || PREFETCHED.has(slug)) return;
            viewportQueue.push(slug);
            drainViewportQueue();
          }, VIEWPORT_DWELL_MS)
        );
      }
    },
    { rootMargin: '200px' }
  );
  return observer;
}

/**
 * 扫描当前文档里的文章链接并挂上观察。路由切换后页面内容变了需要再调一次，
 * 由 usePostPrefetch 负责；每个页面重新计算视口预取的额度。
 * 去重记录也按页面重置：上一页没取成的（被取消、或让路时跳过的）这一页还能再排队，
 * 已经缓存的由 prefetchArticleHtml 自己跳过，不会重复下载。
 */
export function scanPostLinks(): void {
  if (isReactSnapPrerender()) return;
  viewportBudget = VIEWPORT_BUDGET_PER_PAGE;
  viewportQueue.length = 0;
  PREFETCHED.clear();

  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/blog/"]');
  if (links.length === 0 || shouldSkipSpeculativePrefetch()) return;

  const io = ensureObserver();
  for (const link of links) {
    if (observedLinks.has(link)) continue;
    observedLinks.add(link);
    io.observe(link);
  }
}

/** 装一次文档级委托监听。重复调用安全。 */
export function installPostPrefetch(): void {
  if (installed || isReactSnapPrerender()) return;
  installed = true;
  // pointerover 能同时覆盖鼠标悬停与触摸按下前的指针事件；touchstart 兜底老设备
  document.addEventListener('pointerover', onIntent, { passive: true, capture: true });
  document.addEventListener('touchstart', onIntent, { passive: true, capture: true });
  document.addEventListener('focusin', onIntent, { passive: true, capture: true });
}
