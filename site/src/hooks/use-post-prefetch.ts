import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { installPostPrefetch, scanPostLinks } from '@/lib/prefetch-posts';

/**
 * 在 Layout 里调用一次即可：装好文档级的意图监听，并在每次路由切换后重新扫描
 * 页面上的文章链接（列表页翻页、归档页展开年份都会换掉一批链接）。
 *
 * 扫描要等这一帧画完再做，别和 hydration 抢主线程 —— 预取是优化，不该拖慢首屏。
 */
export function usePostPrefetch(): void {
  const location = useLocation();

  useEffect(() => {
    installPostPrefetch();
    const id = requestAnimationFrame(() => scanPostLinks());
    return () => cancelAnimationFrame(id);
  }, [location.pathname, location.search]);
}
