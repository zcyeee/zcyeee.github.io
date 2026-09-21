import { motion, useInView } from 'framer-motion';
import { useCallback, useRef, useState, type ReactNode } from 'react';

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

  return (
    <motion.div
      ref={setNode}
      initial={directionVariants[direction]}
      animate={
        hasEntered || isInView
          ? { x: 0, y: 0, opacity: 1, scale: 1 }
          : directionVariants[direction]
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
