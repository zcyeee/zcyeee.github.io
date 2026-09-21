import { useEffect, useState } from 'react';
import { isReactSnapPrerender } from '@/lib/prerender';

/**
 * 首屏必须跳过入场动画，理由是快照与 hydration 两端都会出问题：
 * react-snap 拍照时若停在入场动画的起始帧，静态页面就是一片空白（归档页曾有 41 处 opacity:0）；
 * 而真实浏览器 hydration 时若重播入场，快照里已经画好的内容会先消失再淡回来。
 * 两种表现都是首次加载时的闪烁。
 *
 * 返回 true 表示当前这次挂载属于首屏。入场动画因此只在 hydration 之后的
 * 客户端路由切换中生效；直接使用 motion.* 而没有经过 AnimatedSection 的地方也要用它。
 */
let hasHydrated = false;

export function useSkipEntryAnimation(): boolean {
  const [skipEntry] = useState(() => isReactSnapPrerender() || !hasHydrated);

  useEffect(() => {
    hasHydrated = true;
  }, []);

  return skipEntry;
}
