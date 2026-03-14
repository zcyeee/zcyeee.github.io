/**
 * Two-layer blog post loader.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Layer 1 – Metadata  (eager, sync, tiny)                                │
 * │  All .md files are scanned at BUILD TIME via import.meta.glob eager.    │
 * │  Only the YAML frontmatter block is kept; the body text is discarded.   │
 * │  Result: main JS bundle contains only metadata (~1-2 KB per post).      │
 * │                                                                          │
 * │  Layer 2 – Content   (lazy, async, code-split)                          │
 * │  Vite creates a SEPARATE CHUNK for each .md file.                       │
 * │  Chunks are only downloaded when a user actually opens that post.       │
 * │  Subsequent visits use the browser's module cache (instant).            │
 * └─────────────────────────────────────────────────────────────────────────┘
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
 * readTime: "10 分钟"
 * tags: ["Tag1", "Tag2"]
 * category: "工程知识"
 * excerpt: "A one-sentence summary shown in the post card."
 * ---
 */

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
     * The browser caches the chunk after the first call; subsequent calls are instant.
     */
    loadContent: () => Promise<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight YAML frontmatter parser (no external deps, handles our format)
// ─────────────────────────────────────────────────────────────────────────────
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
    if (!raw.startsWith('---')) return { data: {}, content: raw };
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return { data: {}, content: raw };

    const yamlBlock = raw.slice(4, end);
    const content = raw.slice(end + 4).replace(/^\n/, '');
    const data: Record<string, unknown> = {};

    for (const line of yamlBlock.split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        const val = line.slice(colon + 1).trim();
        if (!key) continue;
        data[key] = val.startsWith('[')
            ? val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
            : val.replace(/^["']|["']$/g, '');
    }
    return { data, content };
}

function slugFromPath(path: string) {
    return path.replace(/^\.\/posts\//, '').replace(/\.md$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Automatic Reading Time Calculation
// ─────────────────────────────────────────────────────────────────────────────
function calculateReadTime(content: string): string {
    // Remove markdown symbols (roughly) for a better word count
    const text = content.replace(/[#*`~_>-]/g, '');

    // Count CJK (Chinese, Japanese, Korean) characters
    const cjkRegex = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g;
    const cjkCount = (text.match(cjkRegex) || []).length;

    // Count English/Western words (alphanumeric sequences)
    const westernRegex = /[a-zA-Z0-9]+/g;
    const westernCount = (text.match(westernRegex) || []).length;

    // Assume average reading speeds:
    // CJK: 300 characters/minute
    // Western: 200 words/minute
    // Plus a baseline of ~1 minute for images/code blocks if the content is long enough
    const cjkTime = cjkCount / 300;
    const westernTime = westernCount / 200;

    const totalMinutes = Math.max(1, Math.ceil(cjkTime + westernTime));
    return `${totalMinutes} 分钟`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 — Eager metadata scan
// Vite inlines ONLY the frontmatter strings into the main bundle because we
// parse them here and immediately discard the body (no reference kept).
// ─────────────────────────────────────────────────────────────────────────────
const _eagerRaw = import.meta.glob('./posts/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 — Lazy content loaders (one separate Vite chunk per .md file)
// These are NOT downloaded until `post.loadContent()` is called.
// ─────────────────────────────────────────────────────────────────────────────
const _lazyLoaders = import.meta.glob('./posts/*.md', {
    query: '?raw',
    import: 'default',
}) as Record<string, () => Promise<string>>;

// Build the post registry — metadata only, body text is NOT stored
const _allPosts: PostMeta[] = Object.entries(_eagerRaw)
    .map(([path, raw]): PostMeta | null => {
        if (!raw || typeof raw !== 'string') return null;
        const slug = slugFromPath(path);
        const { data, content } = parseFrontmatter(raw); // body (`content`) intentionally not stored

        const title = data.title as string | undefined;
        const date = data.date as string | undefined;
        if (!title || !date) return null;

        // Auto-calculate read time if not provided in frontmatter
        let readTime = data.readTime as string | undefined;
        if (!readTime) {
            readTime = calculateReadTime(content);
        }

        const loader = _lazyLoaders[path];
        return {
            slug,
            title,
            excerpt: (data.excerpt as string) ?? '',
            date,
            readTime,
            tags: (data.tags as string[]) ?? [],
            category: (data.category as string) ?? '未分类',
            loadContent: async () => {
                const fullRaw = await loader();
                return parseFrontmatter(fullRaw).content; // strip frontmatter before rendering
            },
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
