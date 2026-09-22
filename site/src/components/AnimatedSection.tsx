import { motion, useInView } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSkipEntryAnimation } from '@/hooks/use-skip-entry-animation';
import { useRevealWhenScrolledPast } from '@/hooks/use-scrolled-past';
import { isReactSnapPrerender } from '@/lib/prerender';

type InViewOptions = NonNullable<Parameters<typeof useInView>[1]>;
type InViewMargin = InViewOptions extends { margin?: infer M } ? M : undefined;

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  margin?: InViewMargin;
  amount?: number | 'some' | 'all';
}

const directionVariants = {
  up: { y: 60, opacity: 0 },
  down: { y: -60, opacity: 0 },
  left: { x: 60, opacity: 0 },
  right: { x: -60, opacity: 0 },
  none: { opacity: 0, scale: 0.95 },
};

const visibleState = { x: 0, y: 0, opacity: 1, scale: 1 };

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  margin = '-100px',
  amount = 0.15,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin, amount });
  const [hasEntered, setHasEntered] = useState(false);
  const skipEntry = useSkipEntryAnimation();
  /** 首屏区块是否已被「收回」到入场起始态，等着滚进视口再播。详见下方 effect。 */
  const [retracted, setRetracted] = useState(false);

  const setNode = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      if (!node || hasEntered) return;
      const rect = node.getBoundingClientRect();
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewWidth = window.innerWidth || document.documentElement.clientWidth;
      const isVisible =
        rect.bottom >= 0 &&
        rect.top <= viewHeight &&
        rect.right >= 0 &&
        rect.left <= viewWidth;
      if (isVisible) {
        setHasEntered(true);
      }
    },
    [hasEntered]
  );

  // CSS 入场没有视口概念，屏幕外的区块会跟着首帧一起播完 —— 等用户滚下去时早已全部
  // 显示好，第一次访问就完全看不到逐段揭示。所以挂载之后把仍整块在视口下方的区块
  // 收回起始态（那一刻它在屏幕外，用户看不见这次变化），揭示权交还给 useInView。
  //
  // 两处时机上的讲究：
  // 1. 判断只能放在挂载之后。首次渲染必须和快照逐字一致，否则 hydration 不匹配，
  //    React 会丢掉整棵预渲染 DOM 重画（移动端实测阻塞主线程一秒以上）。
  // 2. 量尺寸放进 rAF，免得在 hydration 提交的同一帧里给每个区块强制一次重排；
  //    回调仍在下一次绘制前跑完，而这些区块本就在屏幕外，看不到这次收回。
  useEffect(() => {
    if (!skipEntry || retracted) return;
    // 快照里若写进起始态，静态页面就是一片空白 —— 归档页曾经栽在这上面
    if (isReactSnapPrerender()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      // 用当刻的滚动位置判断：慢网络下 JS 要几秒才落地，用户可能早就翻下去了，
      // 那些已经看过的区块必须原样留着，不能收回去重播。
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      if (node.getBoundingClientRect().top < viewHeight) return;
      setRetracted(true);
    });
    return () => cancelAnimationFrame(id);
  }, [skipEntry, retracted]);

  const revealFromScrolledPast = useCallback(() => setHasEntered(true), []);

  // 收回之后是否还压着起始态。isInView 一旦为真（once: true 会一直保持），
  // class 就换回 .enter-*，动画这时才真正播一次。
  const holdingStart = retracted && !isInView && !hasEntered;

  useRevealWhenScrolledPast(
    ref,
    skipEntry ? holdingStart : !(hasEntered || isInView),
    revealFromScrolledPast
  );

  // 首屏（含 react-snap 快照）走 CSS 入场：class 随快照一起落地，浏览器首帧即起播，
  // 不依赖 JS，hydration 时两端 DOM 一致，因此不会闪。此处刻意不用 motion.div，
  // 避免 framer-motion 写入的内联 style 与 CSS 动画互相干扰。
  if (skipEntry) {
    return (
      <div
        ref={ref}
        className={`${holdingStart ? 'entry-pending' : 'enter'}-${direction} ${className}`}
        style={delay ? { animationDelay: `${delay}s` } : undefined}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={setNode}
      initial={directionVariants[direction]}
      animate={
        hasEntered || isInView ? visibleState : directionVariants[direction]
      }
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScaleOnHoverProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function ScaleOnHover({
  children,
  className = '',
  scale = 1.02,
}: ScaleOnHoverProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
