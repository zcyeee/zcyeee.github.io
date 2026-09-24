import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AnimatedSection } from '@/components/AnimatedSection';
import { markdownRootClass, MARKDOWN_ROOT_ATTR } from '@/components/markdown-root';
import { getMarkdownRendererSync, loadMarkdownRenderer } from '@/components/markdown-renderer-async';
import { consumePrerenderedArticle } from '@/lib/prerendered-article';
import { canReuseArticleHtml, getArticleHtmlSync, loadArticleHtml, waitForArticleHtml } from '@/lib/article-html';
import { getPostBySlug, sortedPosts } from '@/content/posts-loader';
import { use, useState, useEffect, useMemo } from 'react';
import { useSeo } from '@/hooks/use-seo';

export function BlogPost() {
    const [searchParams] = useSearchParams();
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? getPostBySlug(slug) : undefined;
    const isFromArchive = searchParams.get('from') === 'archive';
    const pageParam = Number(searchParams.get('page'));
    const backToList = isFromArchive
        ? '/archive'
        : Number.isFinite(pageParam) && pageParam > 1
            ? `/blog?page=${pageParam}`
            : '/blog';
    const backButtonText = isFromArchive ? '返回归档列表' : '返回博客列表';
    const relatedParams = new URLSearchParams();
    if (isFromArchive) {
        relatedParams.set('from', 'archive');
    } else if (Number.isFinite(pageParam) && pageParam > 1) {
        relatedParams.set('page', String(pageParam));
    }
    const relatedSuffix = relatedParams.toString() ? `?${relatedParams.toString()}` : '';

    // 注意：站内从一篇文章跳到另一篇时，这个组件不会重新挂载，所以下面所有状态都必须按 slug 区分。

    // 首屏直接复用预渲染好的正文 DOM，跳过 Markdown 解析 / KaTeX / 代码高亮的重算。
    // 它只属于首屏那一篇，跳到别的文章后绝不能再拿来用。
    const [prerendered] = useState(() => consumePrerenderedArticle());
    const firstScreenHtml = prerendered && prerendered.slug === slug ? prerendered.html : null;

    // 站内切换：直接复用目标文章预渲染好的 HTML（见 lib/article-html）。
    // 取不到的文章记进 markdownFallback，改走 Markdown 渲染。
    const reuseHtml = canReuseArticleHtml();
    const [htmlBySlug, setHtmlBySlug] = useState<Record<string, string>>({});
    const [markdownFallback, setMarkdownFallback] = useState<Record<string, boolean>>({});
    const useMarkdown = firstScreenHtml === null && (!reuseHtml || (slug ? markdownFallback[slug] === true : false));
    const articleHtml =
        firstScreenHtml ??
        (slug && reuseHtml && !useMarkdown ? htmlBySlug[slug] ?? getArticleHtmlSync(slug) : null);

    const [contentBySlug, setContentBySlug] = useState<Record<string, string>>({});
    const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
    // 能同步拿到正文时直接用，避免首帧先渲染 loading 占位
    const syncContent = useMemo(() => post?.getContentSync() ?? null, [post]);
    const content = syncContent ?? (slug ? contentBySlug[slug] ?? null : null);
    /**
     * 渲染栈是按需加载的，只有走 Markdown 渲染时才需要（开发环境、react-snap 预渲染、
     * 以及预渲染 HTML 取不到时的回退）。已经就绪时同步取到组件，这一帧就能直出正文。
     */
    const [Renderer, setRenderer] = useState(() => getMarkdownRendererSync());
    // 与 loadErrors 分开记：正文与渲染栈并行加载，正文成功时会清掉自己的失败标记，
    // 共用一份的话渲染栈的失败会被一起清掉，页面就一直停在 loading
    const [rendererErrors, setRendererErrors] = useState<Record<string, boolean>>({});
    const loadError = slug
        ? loadErrors[slug] === true || (Renderer === null && rendererErrors[slug] === true)
        : false;

    useEffect(() => {
        if (!post || !slug || articleHtml !== null || useMarkdown) return;
        let cancelled = false;
        loadArticleHtml(slug).then((html) => {
            if (cancelled) return;
            if (html !== null) setHtmlBySlug((prev) => (prev[slug] === html ? prev : { ...prev, [slug]: html }));
            else setMarkdownFallback((prev) => (prev[slug] ? prev : { ...prev, [slug]: true }));
        });
        return () => {
            cancelled = true;
        };
    }, [post, slug, articleHtml, useMarkdown]);

    useEffect(() => {
        if (!useMarkdown || !post || !slug || syncContent !== null) return;
        let cancelled = false;
        post
            .loadContent()
            .then((nextContent) => {
                if (cancelled) return;
                setContentBySlug((prev) => (prev[slug] === nextContent ? prev : { ...prev, [slug]: nextContent }));
                setLoadErrors((prev) => (prev[slug] ? { ...prev, [slug]: false } : prev));
            })
            .catch(() => {
                if (cancelled) return;
                setLoadErrors((prev) => (prev[slug] ? prev : { ...prev, [slug]: true }));
            });
        return () => {
            cancelled = true;
        };
    }, [useMarkdown, post, slug, syncContent]);

    // 只有真的要自己渲染 Markdown 时才拉渲染栈
    useEffect(() => {
        if (!useMarkdown || Renderer !== null) return;
        let cancelled = false;
        loadMarkdownRenderer()
            .then((component) => {
                if (!cancelled) setRenderer(() => component);
            })
            .catch(() => {
                if (!cancelled) setRendererErrors((prev) => (slug && !prev[slug] ? { ...prev, [slug]: true } : prev));
            });
        return () => {
            cancelled = true;
        };
    }, [useMarkdown, Renderer, slug]);

    // 必须在下面的 404 提前返回之前调用，否则会违反 hooks 调用顺序
    useSeo(
        post
            ? {
                title: post.title,
                description: post.excerpt,
                path: `/blog/${post.slug}`,
                type: 'article',
                publishedTime: post.date,
                tags: post.tags,
            }
            : { title: '文章未找到', path: slug ? `/blog/${slug}` : '/blog' }
    );

    // Related posts: same category, exclude current, up to 3
    const relatedPosts = post
        ? sortedPosts.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3)
        : [];
    const hoverTransition = { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

    // 站内切换过来、正文还没到：挂起，让 React 在这次导航（transition）里继续显示当前页面，
    // 正文到了再一起切过来，而不是先闪一下 loading。最多等多久见 lib/article-html。
    if (post && slug && articleHtml === null && reuseHtml && !useMarkdown) {
        use(waitForArticleHtml(slug));
    }

    // 404
    if (!post) {
        return (
            <div className="min-h-screen pb-16 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">文章未找到</h1>
                    <p className="text-muted-foreground mb-6">该文章不存在或已被删除。</p>
                    <Link to={backToList}>
                        <Button variant="outline" className="gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            {backButtonText}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-6">
            {/* Header — metadata is always available immediately (sync) */}
            <section className="py-4">
                <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <Link to={backToList}>
                            <Button variant="ghost" size="sm" className="gap-1 mb-4">
                                <ArrowLeft className="w-4 h-4" />
                                {backButtonText}
                            </Button>
                        </Link>
                    </AnimatedSection>

                    <AnimatedSection delay={0.1}>
                        <div className="px-4 md:px-6">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge>{post.category}</Badge>
                                {post.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold mb-3">{post.title}</h1>
                            <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {post.date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {post.readTime}
                                </span>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Content — lazy-loaded, shows spinner until the chunk arrives */}
            <section className="pt-4 pb-0">
                <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection delay={0.2}>
                        <Card className="border-border/50 bg-card/90 shadow-md shadow-primary/5 dark:bg-card/80 dark:shadow-black/20">
                            <CardContent className="p-4 md:p-6">
                                {articleHtml !== null ? (
                                    <div
                                        {...{ [MARKDOWN_ROOT_ATTR]: '' }}
                                        className={`${markdownRootClass} `}
                                        dangerouslySetInnerHTML={{ __html: articleHtml }}
                                    />
                                ) : loadError ? (
                                    <p className="text-destructive text-sm">内容加载失败，请刷新页面重试。</p>
                                ) : !useMarkdown || content === null || Renderer === null ? (
                                    <div className="loading-reveal flex items-center justify-center py-20 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                        加载内容中…
                                    </div>
                                ) : (
                                    <Renderer content={content} />
                                )}
                            </CardContent>
                        </Card>
                    </AnimatedSection>

                    {/* Actions — shown immediately, don't wait for content */}
                    <AnimatedSection delay={0.3}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t">
                            <div className="flex gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({ title: post.title, url: window.location.href });
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                        }
                                    }}
                                >
                                    <Share2 className="w-4 h-4" />
                                    分享
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 min-w-0 sm:justify-end">
                                {post.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Related Posts */}
                    {relatedPosts.length > 0 && (
                        <AnimatedSection delay={0.4}>
                            <div className="mt-10">
                                <h2 className="text-lg sm:text-xl font-semibold mb-4">相关文章</h2>
                                <div className="space-y-3">
                                    {relatedPosts.map((related) => (
                                        <motion.div
                                            key={related.slug}
                                            whileHover={{ y: -4 }}
                                            whileTap={{ scale: 0.985 }}
                                            transition={hoverTransition}
                                        >
                                            <Link to={`/blog/${related.slug}${relatedSuffix}`}>
                                                <Card className="cursor-pointer border-border/40 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 transition-all duration-300">
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium hover:text-primary transition-colors">{related.title}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">{`${related.date} · ${related.readTime}`}</p>
                                                        </div>
                                                        <Badge variant="secondary" className="ml-4 flex-shrink-0">{related.category}</Badge>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </AnimatedSection>
                    )}
                </div>
            </section>
        </div>
    );
}
