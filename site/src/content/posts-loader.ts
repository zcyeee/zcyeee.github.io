/**
 * Two-layer blog post loader.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Layer 1 – 元数据（eager、同步、很小）                                   │
 * │  `*.md?frontmatter` 由构建期插件处理，只返回 YAML 头部解析后的对象，       │
 * │  正文不进主包。每篇大约几百字节，列表页/归档页/导航栏标题都能同步取用。     │
 * │                                                                          │
 * │  Layer 2 – 正文（lazy、按篇一个 chunk）                                  │
 * │  非 eager 的 `?raw` glob 让 Vite 给每个 .md 单独出块，点开哪篇下载哪篇，   │
 * │  下载过的存进 _contentCache，之后同步命中。                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 分成两层的原因：eager 引入 `?raw` 会把 23 篇文章的全文钉进主包（实测 493 KB
 * 原始体积 / 171 KB gzip），首页一个字都用不上却要全部下载并解析 —— 中端手机上
 * 这部分解析开销正好砸在入场动画窗口里，既拖慢可交互时间，又把动效吃掉。
 *
 * TO ADD A NEW POST:
 *   1. Create `src/content/posts/<your-slug>.md`
 *   2. Add a YAML frontmatter block at the top (see template below).
 *   3. Done — everything else is automatic.
 *
 * FRONTMATTER TEMPLATE:
 * ---
 * title: "Your Post Title"
 * date: "2026-01-01"
 * readTime: "10 分钟"        # 省略则由构建期按字数估算
 * tags: ["Tag1", "Tag2"]
 * category: "工程知识"
 * excerpt: "A one-sentence summary shown in the post card."
 * ---
 */

import { parseFrontmatter, type PostFrontmatter } from './frontmatter';

export interface PostMeta {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    readTime: string;
    tags: string[];
    category: string;
    /**
     * Async — downloads and returns the markdown body (frontmatter stripped).
     * 下载结果会进缓存，后续调用（含 getContentSync）直接命中。
     */
    loadContent: () => Promise<string>;
    /**
     * Sync — 正文已在本地时直接返回，否则返回 null。
     *
     * 只用于 Markdown 渲染路径：开发环境、react-snap 预渲染，以及线上取不到预渲染 HTML 时的回退。
     * 线上站内切换文章走的是 lib/article-html，不经过这里。
     */
    getContentSync: () => string | null;
}

function slugFromPath(path: string) {
    return path.replace(/^\.\/posts\//, '').replace(/\.md$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 — 元数据（eager）。`?frontmatter` 由 plugins/markdown-frontmatter.ts
// 处理，返回的对象里已经带着构建期算好的 readTime。
// ─────────────────────────────────────────────────────────────────────────────
const _meta = import.meta.glob('./posts/*.md', {
    query: '?frontmatter',
    import: 'default',
    eager: true,
}) as Record<string, PostFrontmatter>;

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 — 正文（lazy，每个 .md 一个独立 chunk），调用前不会产生任何下载
// ─────────────────────────────────────────────────────────────────────────────
const _rawLoaders = import.meta.glob('./posts/*.md', {
    query: '?raw',
    import: 'default',
}) as Record<string, () => Promise<string>>;

/** slug → 已剥掉 frontmatter 的正文。跨路由切换保留，所以返回同一篇时是同步的。 */
const _contentCache = new Map<string, string>();
/** slug → 正在进行中的请求，避免预取和真实打开重复下载同一个 chunk。 */
const _inflight = new Map<string, Promise<string>>();

function loadContentFor(slug: string, path: string): Promise<string> {
    const cached = _contentCache.get(slug);
    if (cached !== undefined) return Promise.resolve(cached);

    const existing = _inflight.get(slug);
    if (existing) return existing;

    const loader = _rawLoaders[path];
    const task = loader()
        .then((fullRaw) => {
            const { content } = parseFrontmatter(fullRaw);
            _contentCache.set(slug, content);
            _inflight.delete(slug);
            return content;
        })
        .catch((error) => {
            _inflight.delete(slug);
            throw error;
        });

    _inflight.set(slug, task);
    return task;
}

const _allPosts: PostMeta[] = Object.entries(_meta)
    .map(([path, meta]): PostMeta | null => {
        if (!meta || !meta.title || !meta.date) return null;
        const slug = slugFromPath(path);

        return {
            slug,
            title: meta.title,
            excerpt: meta.excerpt,
            date: meta.date,
            readTime: meta.readTime,
            tags: meta.tags,
            category: meta.category,
            loadContent: () => loadContentFor(slug, path),
            getContentSync: () => _contentCache.get(slug) ?? null,
        };
    })
    .filter((p): p is PostMeta => p !== null);

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** All posts sorted by date (newest first) */
export const sortedPosts: PostMeta[] = [..._allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

/** Find a post by its URL slug */
export function getPostBySlug(slug: string): PostMeta | undefined {
    return _allPosts.find((p) => p.slug === slug);
}

/**
 * 预热某篇文章的正文 chunk。失败不抛 —— 预取只是优化，真正打开时还会再走一次
 * loadContent，那条路径才负责把错误反馈给用户。
 */
export function prefetchPostContent(slug: string): void {
    const post = _allPosts.find((p) => p.slug === slug);
    if (!post || _contentCache.has(slug)) return;
    void post.loadContent().catch(() => {});
}

/** Group posts into { year → { month → posts[] } } for the Archive page */
export function buildArchiveData() {
    const groups: Record<string, Record<string, PostMeta[]>> = {};
    for (const post of sortedPosts) {
        const [year, month] = post.date.split('-');
        if (!groups[year]) groups[year] = {};
        if (!groups[year][month]) groups[year][month] = [];
        groups[year][month].push(post);
    }
    return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, months]) => ({
            year,
            months: Object.entries(months)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([month, posts]) => ({
                    month: `${parseInt(month)}月`,
                    posts,
                })),
        }));
}

/** Count posts per category, sorted by count desc */
export function buildCategoryStats() {
    const counts: Record<string, number> = {};
    for (const post of _allPosts) {
        counts[post.category] = (counts[post.category] ?? 0) + 1;
    }
    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}
