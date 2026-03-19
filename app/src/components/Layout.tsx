import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Camera, Archive } from 'lucide-react';
import { siteConfig } from '@/data/siteConfig';

const iconMap: Record<string, React.ElementType> = {
  Home,
  BookOpen,
  Archive,
  Camera,
};

const normalizePath = (path: string) => {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentPath = useMemo(() => normalizePath(location.pathname), [location.pathname]);
  const isPrerendering = typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const navLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const lastIndicatorCenterRef = useRef<number | null>(null);
  const lastPositionedPathRef = useRef<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ x: number; y: number; width: number; height: number; isVisible: boolean }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isVisible: false,
  });
  const [indicatorDuration, setIndicatorDuration] = useState(0);
  const [isIndicatorReady, setIsIndicatorReady] = useState(false);

  useEffect(() => {
    const restorePage = sessionStorage.getItem('blogScrollRestorePage');
    if (location.pathname === '/blog' && restorePage) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  const navItems = useMemo(() => siteConfig.navItems.map(item => ({
    ...item,
    normalizedPath: normalizePath(item.path),
    icon: iconMap[item.icon] || Home
  })), []);


  const hoverTransition = { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };
  const indicatorTransition = { duration: indicatorDuration, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
  const indicatorInset = 0;
  const indicatorMinDuration = 1.0;
  const indicatorMaxDuration = 1.6;
  const indicatorPixelsPerSecond = 330;

  const updateIndicator = useCallback(() => {
    const navContainer = navContainerRef.current;
    const activeLink = navLinkRefs.current[currentPath];
    if (!navContainer || !activeLink) return;

    const containerRect = navContainer.getBoundingClientRect();
    const activeRect = activeLink.getBoundingClientRect();
    const nextX = activeRect.left - containerRect.left + indicatorInset;
    const nextY = activeRect.top - containerRect.top + indicatorInset;
    const nextWidth = Math.max(activeRect.width - indicatorInset * 2, 0);
    const nextHeight = Math.max(activeRect.height - indicatorInset * 2, 0);
    const nextCenter = nextX + nextWidth / 2;
    const prevCenter = lastIndicatorCenterRef.current;
    const isNavigation =
      lastPositionedPathRef.current !== null &&
      lastPositionedPathRef.current !== currentPath;

    if (isNavigation && prevCenter !== null) {
      const distance = Math.abs(nextCenter - prevCenter);
      const adaptiveDuration = Math.min(
        indicatorMaxDuration,
        Math.max(indicatorMinDuration, distance / indicatorPixelsPerSecond)
      );
      setIndicatorDuration(adaptiveDuration);
    } else {
      // 非路由切换（首屏二次测量、resize、字体回流等）时直接对齐，避免出现“先错位再平移”。
      setIndicatorDuration(0);
    }

    lastIndicatorCenterRef.current = nextCenter;
    lastPositionedPathRef.current = currentPath;

    setIndicatorStyle({
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
      isVisible: true,
    });
  }, [currentPath, indicatorInset, indicatorMaxDuration, indicatorMinDuration, indicatorPixelsPerSecond]);

  useEffect(() => {
    if (isPrerendering || isIndicatorReady) return;

    let rafId = 0;
    let frameCount = 0;
    let stableFrameCount = 0;
    let prevX: number | null = null;
    let prevWidth: number | null = null;
    let cancelled = false;

    const waitForStablePosition = () => {
      if (cancelled) return;

      const navContainer = navContainerRef.current;
      const activeLink = navLinkRefs.current[currentPath];
      if (!navContainer || !activeLink) {
        rafId = requestAnimationFrame(waitForStablePosition);
        return;
      }

      const containerRect = navContainer.getBoundingClientRect();
      const activeRect = activeLink.getBoundingClientRect();
      const nextX = activeRect.left - containerRect.left + indicatorInset;
      const nextWidth = Math.max(activeRect.width - indicatorInset * 2, 0);

      const isStable =
        prevX !== null &&
        prevWidth !== null &&
        Math.abs(nextX - prevX) < 0.5 &&
        Math.abs(nextWidth - prevWidth) < 0.5;

      stableFrameCount = isStable ? stableFrameCount + 1 : 0;
      prevX = nextX;
      prevWidth = nextWidth;
      frameCount += 1;

      updateIndicator();

      // 仅在真实浏览器中、导航布局稳定后再显示指示器，避免首屏预渲染闪烁。
      if (stableFrameCount >= 1 || frameCount >= 45) {
        setIndicatorDuration(0);
        setIsIndicatorReady(true);
        return;
      }

      rafId = requestAnimationFrame(waitForStablePosition);
    };

    rafId = requestAnimationFrame(waitForStablePosition);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [currentPath, indicatorInset, isIndicatorReady, isPrerendering, updateIndicator]);

  useLayoutEffect(() => {
    if (isPrerendering || !isIndicatorReady) return;
    updateIndicator();
  }, [isIndicatorReady, isPrerendering, updateIndicator]);

  useEffect(() => {
    if (isPrerendering || !isIndicatorReady) return;
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [isIndicatorReady, isPrerendering, updateIndicator]);

  return (
    <div className="min-h-screen relative bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-background to-secondary/[0.03]" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 nav-slide-down">
        <div className="mx-4 mt-4">
          <nav className="max-w-4xl mx-auto bg-background/80 backdrop-blur-xl rounded-full border border-border/50 shadow-lg shadow-black/5">
            <div ref={navContainerRef} className="relative flex items-center justify-center gap-1 px-2 py-2">
              {!isPrerendering && isIndicatorReady && indicatorStyle.isVisible && (
                <motion.div
                  className="absolute left-0 top-0 rounded-full z-0 pointer-events-none bg-[hsl(var(--primary)/0.1)] dark:bg-[hsl(var(--primary)/0.14)]"
                  animate={{ x: indicatorStyle.x, y: indicatorStyle.y, width: indicatorStyle.width, height: indicatorStyle.height }}
                  initial={false}
                  transition={indicatorTransition}
                />
              )}
              {navItems.map((item) => {
                const isActive = item.normalizedPath === currentPath;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    ref={(node) => {
                      navLinkRefs.current[item.normalizedPath] = node;
                    }}
                    className="relative block"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={hoverTransition}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                        ${isActive
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {siteConfig.footerText}
            </p>
            <div className="hidden md:flex items-center gap-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
