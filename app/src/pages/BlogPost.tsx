import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Share2, Bookmark, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AnimatedSection } from '@/components/AnimatedSection';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { getPostBySlug, sortedPosts } from '@/content/posts-loader';
import { useState, useEffect } from 'react';

export function BlogPost() {
    const [searchParams] = useSearchParams();
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? getPostBySlug(slug) : undefined;
    const pageParam = Number(searchParams.get('page'));
    const backToBlog = Number.isFinite(pageParam) && pageParam > 1 ? `/blog?page=${pageParam}` : '/blog';
    const relatedSuffix = Number.isFinite(pageParam) && pageParam > 1 ? `?page=${pageParam}` : '';

    // Lazy-load content only when this post is opened
    const [contentBySlug, setContentBySlug] = useState<Record<string, string>>({});
    const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
    const content = slug ? contentBySlug[slug] ?? null : null;
    const loadError = slug ? loadErrors[slug] ?? false : false;

    useEffect(() => {
        if (!post || !slug) return;
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
    }, [post, slug]);

    // Related posts: same category, exclude current, up to 3
    const relatedPosts = post
        ? sortedPosts.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3)
        : [];

    // 404
    if (!post) {
        return (
            <div className="min-h-screen pb-16 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">文章未找到</h1>
                    <p className="text-muted-foreground mb-6">该文章不存在或已被删除。</p>
                    <Link to={backToBlog}>
                        <Button variant="outline" className="gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            返回博客列表
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
                        <Link to={backToBlog}>
                            <Button variant="ghost" size="sm" className="gap-1 mb-4">
                                <ArrowLeft className="w-4 h-4" />
                                返回博客列表
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
                        <Card className="border-transparent">
                            <CardContent className="p-4 md:p-6">
                                {loadError ? (
                                    <p className="text-destructive text-sm">内容加载失败，请刷新页面重试。</p>
                                ) : content === null ? (
                                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                        加载内容中…
                                    </div>
                                ) : (
                                    <MarkdownRenderer content={content} />
                                )}
                            </CardContent>
                        </Card>
                    </AnimatedSection>

                    {/* Actions — shown immediately, don't wait for content */}
                    <AnimatedSection delay={0.3}>
                        <div className="flex items-center justify-between mt-8 pt-6 border-t">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-1">
                                    <Bookmark className="w-4 h-4" />
                                    收藏
                                </Button>
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
                            <div className="flex gap-2">
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
                                        <motion.div key={related.slug} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                                            <Link to={`/blog/${related.slug}${relatedSuffix}`}>
                                                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium hover:text-primary transition-colors">{related.title}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">{related.date} · {related.readTime}</p>
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
