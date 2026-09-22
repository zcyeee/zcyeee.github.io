import { useEffect, useRef, type RefObject } from 'react';

/**
 * IntersectionObserver 只在「渲染机会」上采样交叉状态。瞬时跳转（锚点、恢复滚动位置、
 * End 键、programmatic scrollTo）可能让一个区块在相邻两帧之间整块掠过视口，观察者
 * 从头到尾拿到的都是 isIntersecting: false —— 入场动画于是永不触发，元素永久停在
 * opacity: 0，内容彻底看不见。实测：站内切回首页后直接跳到页底，中间被掠过的
 * 「实习经历」「项目经历」会一直是空白。
 *
 * 这里只兜「已经滚到视口上方」这一种情况；正常从下方进入视口仍由 IntersectionObserver
 * 负责，原有的触发时机（margin -100px / amount 0.15）因此保持不变。
 * 所有订阅者共用一个 rAF 节流的 scroll 监听，注册表清空后自动摘除。
 */

type Subscriber = { node: HTMLElement; reveal: () => void };

const subscribers = new Set<Subscriber>();
let listening = false;
let frame = 0;

function flush() {
  frame = 0;
  // 先集中读一遍布局，避免读写交替触发多次强制重排
  const passed: Subscriber[] = [];
  for (const sub of subscribers) {
    if (sub.node.getBoundingClientRect().bottom <= 0) passed.push(sub);
  }
  for (const sub of passed) {
    subscribers.delete(sub);
    sub.reveal();
  }
  if (subscribers.size === 0) stopListening();
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', onScroll, { passive: true });
}

function stopListening() {
  if (!listening) return;
  listening = false;
  window.removeEventListener('scroll', onScroll);
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

export function useRevealWhenScrolledPast(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  reveal: () => void
): void {
  const revealRef = useRef(reveal);

  useEffect(() => {
    revealRef.current = reveal;
  }, [reveal]);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const sub: Subscriber = { node, reveal: () => revealRef.current() };
    subscribers.add(sub);
    startListening();

    return () => {
      subscribers.delete(sub);
      if (subscribers.size === 0) stopListening();
    };
  }, [enabled, ref]);
}
