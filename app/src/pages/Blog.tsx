import { motion } from 'framer-motion';
import { BookOpen, Calendar, Clock, ArrowRight, Tag, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatedSection } from '@/components/AnimatedSection';
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { sortedPosts } from '@/content/posts-loader';
import { macroTags, CATEGORIES } from '@/data/blog';

// Top tags from actual posts
// const allTags = sortedPosts.flatMap((p) => p.tags);
// const tagCounts: Record<string, number> = {};
// for (const t of allTags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
// const topTags = Object.entries(tagCounts)
//   .sort(([, a], [, b]) => b - a)
//   .slice(0, 8)
//   .map(([tag]) => tag);

export function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const isMobile = useIsMobile();
  const itemsPerPage = isMobile ? 5 : 8;
  const blogListRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  const scrollRestoreKey = 'blogScrollRestorePage';

  const updatePageParam = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (page <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(page));
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    shouldScrollRef.current = true;
    setSearchQuery(value);
    updatePageParam(1);
  };

  const handleCategoryClick = (category: string) => {
    const nextCategory = selectedCategory === category ? '全部' : category;
    shouldScrollRef.current = true;
    setSelectedCategory(nextCategory);
    updatePageParam(1);
  };

  const filteredPosts = sortedPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === '全部' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const rawPage = Number(searchParams.get('page'));
  const parsedPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const currentPage = totalPages > 0 ? Math.min(parsedPage, totalPages) : 1;
  const scrollKey = `blogScrollY:${currentPage}`;
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const rememberScrollPosition = () => {
    sessionStorage.setItem(scrollKey, String(window.scrollY));
    sessionStorage.setItem(scrollRestoreKey, String(currentPage));
  };

  const handlePageChange = (page: number) => {
    shouldScrollRef.current = true;
    updatePageParam(page);
  };

  useEffect(() => {
    const restorePage = sessionStorage.getItem(scrollRestoreKey);
    if (!restorePage || Number(restorePage) !== currentPage) return;
    const saved = sessionStorage.getItem(`blogScrollY:${restorePage}`);
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(saved), left: 0, behavior: 'auto' });
      });
    }
    sessionStorage.removeItem(scrollRestoreKey);
  }, [currentPage]);

  useEffect(() => {
    if (!shouldScrollRef.current) return;
    shouldScrollRef.current = false;
    if (!blogListRef.current) return;
    requestAnimationFrame(() => {
      blogListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [currentPage]);

  // Featured post: first post in sorted list
  const featuredPost = sortedPosts[0];
  const hoverTransition = { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div
              className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={hoverTransition}
            >
              <BookOpen className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">博客文章</h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              学习记录与文章分享，链接更多的人
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="pt-4 pb-2 md:py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索文章标题、内容或标签..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 text-sm md:text-sm"
                />
              </div>

              {/* Category Filter (mobile) */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 lg:hidden">
                {CATEGORIES.map((cat: string) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryClick(cat)}
                    className="flex-shrink-0"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="pt-6 md:pt-8 pb-0 scroll-mt-6" ref={blogListRef}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Blog Posts */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedPosts.map((post, index) => (
                  <AnimatedSection key={post.slug} delay={index * 0.05} amount={0} margin="50px">
                    <motion.div whileHover={{ y: -4 }} transition={hoverTransition}>
                      <Link
                        to={`/blog/${post.slug}${currentPage > 1 ? `?page=${currentPage}` : ''}`}
                        onClick={rememberScrollPosition}
                      >
                        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20 h-full">
                          <CardContent className="p-5">
                            <div className="flex flex-col gap-2.5 h-full">
                              {/* Category & Date */}
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-[13px] md:text-xs">
                                  {post.category}
                                </Badge>
                                <span className="text-[13px] md:text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {post.date}
                                </span>
                              </div>

                              {/* Title */}
                              <h2 className="text-base md:text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
                                {post.title}
                              </h2>

                              {/* Excerpt */}
                              <p className="text-sm md:text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                                {post.excerpt}
                              </p>

                              {/* Tags & Read Time */}
                              <div className="flex items-center justify-between pt-2">
                                <div className="flex flex-wrap gap-1">
                                  {post.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {post.readTime}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  </AnimatedSection>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) handlePageChange(currentPage - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={page === currentPage}
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page);
                            }}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) handlePageChange(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {filteredPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">没有找到匹配的文章</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Macro Tags */}
              <AnimatedSection delay={0.2} className="hidden lg:block">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      文章分类
                    </h3>
                    <div className="space-y-2">
                      {macroTags.map((tag) => (
                        <motion.button
                          key={tag.name}
                          whileHover={{ x: 4 }}
                          transition={hoverTransition}
                          onClick={() => handleCategoryClick(tag.name)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${selectedCategory === tag.name
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                            }`}
                        >
                          <div className="font-medium text-sm">{tag.name}</div>
                          <div className="text-xs text-muted-foreground">{tag.desc}</div>
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Featured Post */}
              {featuredPost && (
                <AnimatedSection delay={0.4}>
                  <motion.div whileHover={{ y: -4 }} transition={hoverTransition}>
                    <Card className="group bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-5 flex flex-col gap-3 h-full">
                        <div className="flex items-center justify-between">
                          <Badge className="w-fit">推荐阅读</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {featuredPost.date}
                          </span>
                        </div>
                        <h3 className="text-base md:text-base font-semibold group-hover:text-primary transition-colors">{featuredPost.title}</h3>
                        <p className="text-sm md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {featuredPost.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between">
                          <Link
                            to={`/blog/${featuredPost.slug}${currentPage > 1 ? `?page=${currentPage}` : ''}`}
                            onClick={rememberScrollPosition}
                          >
                            <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
                              阅读全文
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {featuredPost.readTime}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatedSection>
              )}
            </div>
          </div>
        </div>
      </section>
      <nav className="sr-only">
        {sortedPosts.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        ))}
      </nav>
    </div>
  );
}
