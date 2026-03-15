import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const [activeRect, setActiveRect] = useState<{ left: number; width: number; opacity: number } | null>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const currentPath = useMemo(() => normalizePath(location.pathname), [location.pathname]);

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

  useLayoutEffect(() => {
    const activeIndex = navItems.findIndex(item => item.normalizedPath === currentPath);
    if (activeIndex < 0) {
      return;
    }

    let frameId: number | null = null;
    let retries = 0;

    const updateRect = () => {
      const el = navRefs.current[activeIndex];
      if (el && el.offsetWidth > 0) {
        setActiveRect({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
        return;
      }

      if (retries < 8) {
        retries += 1;
        frameId = requestAnimationFrame(updateRect);
      }
    };

    updateRect();
    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [currentPath, navItems]);
  const hoverTransition = { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

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
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-4 mt-4">
          <nav className="max-w-4xl mx-auto bg-background/80 backdrop-blur-xl rounded-full border border-border/50 shadow-lg shadow-black/5">
            <div className="relative flex items-center justify-center gap-1 px-2 py-2">
              {activeRect && (
                <motion.div
                  className="absolute bg-primary/10 rounded-full h-[calc(100%-16px)] top-2 pointer-events-none"
                  initial={false}
                  animate={{
                    left: activeRect.left,
                    width: activeRect.width,
                    opacity: activeRect.opacity,
                  }}
                  transition={{ type: 'spring', stiffness: 140, damping: 30, mass: 1.15 }}
                />
              )}
              {navItems.map((item, index) => {
                const isActive = item.normalizedPath === currentPath;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    ref={(el) => {
                      if (el) navRefs.current[index] = el;
                    }}
                    to={item.path}
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
      </motion.header>

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
