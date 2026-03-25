import { motion } from 'framer-motion';
import { Archive as ArchiveIcon, Calendar, Tag, ChevronRight, BarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedSection, ScaleOnHover } from '@/components/AnimatedSection';
import { Link } from 'react-router-dom';
import { buildArchiveData, buildCategoryStats, sortedPosts } from '@/content/posts-loader';
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const archiveData = buildArchiveData();
const categoryStats = buildCategoryStats();
const INITIAL_POSTS = 20;
const LOAD_MORE_POSTS = 20;
const TOTAL_POSTS = sortedPosts.length;
const ARCHIVE_SCROLL_RESTORE_KEY = 'archiveScrollRestore';
const ARCHIVE_SCROLL_Y_KEY = 'archiveScrollY';

/** Slice archiveData so only posts up to `limit` are included. */
function getVisibleArchiveData(limit: number) {
  let remaining = limit;
  const result = [];
  for (const yearData of archiveData) {
    if (remaining <= 0) break;
    const months = [];
    for (const monthData of yearData.months) {
      if (remaining <= 0) break;
      const posts = monthData.posts.slice(0, remaining);
      remaining -= posts.length;
      months.push({ ...monthData, posts });
    }
    result.push({ ...yearData, months });
  }
  return result;
}

export function Archive() {
  const isMobile = useIsMobile();
  const totalPosts = sortedPosts.length;
  const totalCategories = categoryStats.length;
  const earliestDate = sortedPosts[sortedPosts.length - 1]?.date.slice(0, 7) ?? '--';
  const latestDate = sortedPosts[0]?.date.slice(0, 7) ?? '--';

  const [visiblePostCount, setVisiblePostCount] = useState(INITIAL_POSTS);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visiblePostCount < TOTAL_POSTS;

  const rememberScrollPosition = () => {
    sessionStorage.setItem(ARCHIVE_SCROLL_Y_KEY, String(window.scrollY));
    sessionStorage.setItem(ARCHIVE_SCROLL_RESTORE_KEY, '1');
  };

  useEffect(() => {
    const shouldRestore = sessionStorage.getItem(ARCHIVE_SCROLL_RESTORE_KEY);
    if (!shouldRestore) return;
    const saved = sessionStorage.getItem(ARCHIVE_SCROLL_Y_KEY);
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(saved), left: 0, behavior: 'auto' });
      });
    }
    sessionStorage.removeItem(ARCHIVE_SCROLL_RESTORE_KEY);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisiblePostCount((prev) => Math.min(prev + LOAD_MORE_POSTS, TOTAL_POSTS));
        }
      },
      { rootMargin: '500px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const visibleArchiveData = getVisibleArchiveData(visiblePostCount);
  const hoverTransition = { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <section className="py-8 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div
              className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={hoverTransition}
            >
              <ArchiveIcon className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">归档记录</h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              按时间线和分类整理所有文章
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="pt-0 sm:pt-2 pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">

            {/* Timeline */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <AnimatedSection className="flex items-center gap-3 mb-6">
                <motion.div
                  className="p-2 rounded-lg bg-primary/10"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={hoverTransition}
                >
                  <Calendar className="w-5 h-5 text-primary" />
                </motion.div>
                <h2 className="text-xl md:text-2xl font-bold">时间线</h2>
              </AnimatedSection>

              <div className="space-y-10">
                {visibleArchiveData.map((yearData, yearIndex) => (
                  <div key={yearData.year}>
                    {/* Year marker */}
                    <AnimatedSection delay={yearIndex * 0.08} amount={0} margin="50px">
                      <div className="flex items-center gap-4 mb-5">
                        <span className="text-2xl font-bold text-primary">{yearData.year}</span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[13px] md:text-xs text-muted-foreground">
                          {yearData.months.reduce((acc, m) => acc + m.posts.length, 0)} 篇
                        </span>
                      </div>
                    </AnimatedSection>

                    {/* Months */}
                    <div className="ml-3 border-l-2 border-border/50 pl-6 space-y-5">
                      {yearData.months.map((monthData) => (
                        <div key={monthData.month}>
                          {/* Month dot + label */}
                          <AnimatedSection delay={0} amount={0} margin="50px">
                            <div className="flex items-center gap-2 mb-3 -ml-[30px]">
                              <div className="w-3.5 h-3.5 rounded-full bg-background border-2 border-primary/50 flex-shrink-0" />
                              <h3 className="text-sm font-medium text-muted-foreground">
                                {monthData.month}
                              </h3>
                            </div>
                          </AnimatedSection>

                          <div className="space-y-2">
                            {monthData.posts.map((post, postIndex) => (
                              <AnimatedSection key={post.slug} delay={postIndex * 0.05} amount={0} margin="50px">
                                <motion.div
                                  whileHover={{ y: -2, x: 2 }}
                                  transition={hoverTransition}
                                  className="group"
                                >
                                  <Link to={`/blog/${post.slug}?from=archive`} onClick={rememberScrollPosition}>
                                    <Card className="cursor-pointer hover:shadow-md transition-all duration-300 border-transparent hover:border-primary/20">
                                      <CardContent className="p-3.5">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm md:text-base truncate group-hover:text-primary transition-colors duration-200">
                                              {post.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1 text-[13px] md:text-xs text-muted-foreground">
                                              <span>{post.date}</span>
                                              <span>·</span>
                                              <span className="text-primary/70 font-medium">{post.category}</span>
                                            </div>
                                          </div>
                                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </Link>
                                </motion.div>
                              </AnimatedSection>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sentinel + status indicator */}
              <div ref={sentinelRef} className="mt-8 flex justify-center">
                {hasMore ? (
                  <span className="text-xs text-muted-foreground animate-pulse">加载更多…</span>
                ) : totalPosts > 0 ? (
                  <span className="text-xs text-muted-foreground">— 已显示全部 {totalPosts} 篇文章 —</span>
                ) : null}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6 order-1 lg:order-2 lg:sticky lg:top-28 self-start">

              {/* Stats Card */}
              <AnimatedSection delay={0.2} className="hidden sm:block">
                <ScaleOnHover scale={1.01}>
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-primary" />
                        统计概览
                      </h3>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                        {[
                          { label: '文章总数', value: totalPosts },
                          { label: '最新发布', value: latestDate },
                          { label: '分类数量', value: totalCategories },
                          { label: '最早发布', value: earliestDate },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3 rounded-md py-1">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </ScaleOnHover>
              </AnimatedSection>

              {/* Categories */}
              <AnimatedSection delay={isMobile ? 0.15 : 0.3}>
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      文章分类
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-1.5">
                      {categoryStats.map((cat, index) => (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (isMobile ? 0.15 : 0.3) + index * 0.05, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                          whileHover={{ x: 4, transition: hoverTransition }}
                          className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg hover:bg-muted transition-colors cursor-default"
                        >
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                            {cat.count}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
