import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { MARKDOWN_ROOT_ATTR } from '@/components/markdown-root';
import { isReactSnapPrerender } from '@/lib/prerender';

/**
 * 文章页左侧留白里的目录：列出正文的大节（h2）与小节（h3），高亮当前读到的那一节。
 *
 * 目录是一个固定高度的窗口，条目在里面像转动的球面：当前一节转到窗口中央，还有内容的那一端
 * 逐渐淡出、向后弯，转到头的那一端是平的。窗口高度不随条目变化，整块因此可以竖直居中而不跳动；
 * 条目全部常驻、不折叠，列表自身的布局也不变，阅读时唯一的运动就是整列平移。
 *
 * 线上的正文是直接复用的预渲染 HTML（见 lib/prerendered-article、lib/article-html），
 * 浏览器拿不到 Markdown 原文，所以标题只能从渲染好的 DOM 里收集。
 */

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
  /** 所属大节（h2）的 id；排在第一个大节之前的小节为空串 */
  section: string;
}

interface Collected {
  key: string;
  items: TocItem[];
  /** 与 items 一一对应 */
  headings: HTMLElement[];
}

interface ArticleTocProps {
  /**
   * 目录的定位容器，也是目录吸附的活动范围：须为 relative、占满页面宽度、从页头顶端延伸到正文卡片底边。
   * 标题从其中的正文根节点收集。
   */
  contentRef: RefObject<HTMLElement | null>;
  /** 正文渲染出来后给出、换一篇时随之变化；正文还没出来时为 null */
  contentKey: string | null;
}

/** 正文卡片 960px 宽、居中，视口再窄，左侧留白就放不下 190px 宽的目录 */
const WIDE_QUERY = '(min-width: 1440px)';
/** 标题上沿越过这条线（距视口顶部，略低于固定导航栏下沿）就算读到了这一节 */
const ACTIVE_LINE = 120;
const REFERENCE_TITLE = /^(参考资料|参考文献|references?)$/i;
/** 两端渐隐区最长占窗口高度的比例 */
const FADE_RATIO = 0.3;
/** 窗口边缘的条目最多缩小多少、向右偏多少 px，做出球面向后弯的感觉 */
const CURVE_SCALE = 0.1;
const CURVE_SHIFT = 10;
const SPIN = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
/** 鼠标移出目录后，过这么久再转回当前一节 */
const SNAP_BACK_MS = 600;

interface WheelLayout {
  key: string;
  /** 各条目相对列表顶端的位置与高度，与 items 一一对应 */
  tops: number[];
  heights: number[];
  listHeight: number;
  windowHeight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 让第 index 项落在窗口中央时列表的位移；转到头时就停住，不在首尾留出空白 */
function offsetFor(layout: WheelLayout, index: number): number {
  const { tops, heights, listHeight, windowHeight } = layout;
  if (listHeight <= windowHeight) return (windowHeight - listHeight) / 2;
  const i = clamp(index, 0, tops.length - 1);
  return clamp(windowHeight / 2 - (tops[i] + heights[i] / 2), windowHeight - listHeight, 0);
}

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// react-snap 快照里不能带目录：它要等挂载后量过 DOM 才有内容，hydration 首帧渲染不出同样的东西
const getWide = () => !isReactSnapPrerender() && window.matchMedia(WIDE_QUERY).matches;
const getWideDuringHydration = () => false;

function headingText(heading: HTMLElement): string {
  const clone = heading.cloneNode(true) as HTMLElement;
  // KaTeX 每个公式同时输出 MathML 和 HTML 两份，直接取 textContent 会混进 TeX 原文和重复的字符
  clone.querySelectorAll('.katex-mathml').forEach((node) => node.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function collectHeadings(container: HTMLElement | null): Omit<Collected, 'key'> | null {
  const root = container?.querySelector<HTMLElement>(`[${MARKDOWN_ROOT_ATTR}]`);
  if (!root) return null;

  const items: TocItem[] = [];
  const headings: HTMLElement[] = [];
  let section = '';
  let inReferences = false;
  // 只收正文的直接子节点：折叠块（details）里的标题默认收起，跳过去也看不到
  for (const heading of root.querySelectorAll<HTMLElement>(':scope > h2[id], :scope > h3[id]')) {
    const text = headingText(heading);
    if (!text) continue;
    const level = heading.tagName === 'H2' ? 2 : 3;
    if (level === 2) {
      // 参考资料不是正文的一节，连同它下面的小节都不进目录；读到那里时高亮停在最后一节正文
      inReferences = REFERENCE_TITLE.test(text);
      section = heading.id;
    }
    if (inReferences) continue;
    items.push({ id: heading.id, text, level, section });
    headings.push(heading);
  }
  return { items, headings };
}

function findActive(headings: HTMLElement[]): number {
  if (headings.length === 0) return -1;
  const viewHeight = window.innerHeight;
  const remaining = Math.max(0, document.documentElement.scrollHeight - viewHeight - window.scrollY);
  // 滚到页底时，最后几节的标题可能永远到不了 ACTIVE_LINE：
  // 算出滚到底时最后一节离 ACTIVE_LINE 还差多少，在收尾这一程里把判定线平滑往下放，避免最后 2px 才跳变
  const lastEndTop = headings[headings.length - 1].getBoundingClientRect().top - remaining;
  const shortfall = Math.max(0, lastEndTop - ACTIVE_LINE);
  const range = Math.max(shortfall, viewHeight * 0.35);
  const line =
    shortfall > 0 && remaining < range
      ? ACTIVE_LINE + ((range - remaining) / range) * (shortfall + 2)
      : ACTIVE_LINE;

  let active = -1;
  for (let i = 0; i < headings.length; i += 1) {
    if (headings[i].getBoundingClientRect().top > line) break;
    active = i;
  }
  return active;
}

export function ArticleToc({ contentRef, contentKey }: ArticleTocProps) {
  const isWide = useSyncExternalStore(subscribeWide, getWide, getWideDuringHydration);
  const reduceMotion = useReducedMotion();
  const [collected, setCollected] = useState<Collected | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** 点目录跳转、页面平滑滚动期间，高亮停在点中的那一项，不跟着途经的各节闪 */
  const lockedIndexRef = useRef<number | null>(null);
  const settleTimerRef = useRef(0);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [layout, setLayout] = useState<WheelLayout | null>(null);
  /** 列表相对窗口顶端的位移，也就是「球」转到了哪里 */
  const offset = useMotionValue(0);
  /** 用户在目录上转滚轮、或用键盘逐项浏览时为 true，这期间不自动转回当前一节 */
  const [browsing, setBrowsing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const placedKeyRef = useRef<string | null>(null);

  const current = isWide && collected && collected.key === contentKey ? collected : null;
  const activeItem = current && activeIndex >= 0 ? current.items[activeIndex] : undefined;
  const wheel = current && layout && layout.key === current.key ? layout : null;

  useEffect(() => {
    if (!isWide || contentKey === null) return;
    // 量布局放进 rAF，免得在正文提交的同一帧里强制一次重排
    const frame = requestAnimationFrame(() => {
      const next = collectHeadings(contentRef.current);
      setCollected(next ? { key: contentKey, ...next } : null);
      setActiveIndex(next ? findActive(next.headings) : -1);
    });
    return () => cancelAnimationFrame(frame);
  }, [isWide, contentKey, contentRef]);

  useEffect(() => {
    if (!current) return;
    const { headings } = current;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (lockedIndexRef.current === null) setActiveIndex(findActive(headings));
    };
    const schedule = () => {
      if (lockedIndexRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        // 平滑滚动停稳后只解锁，不重算 activeIndex：点在靠页底的小节时标题到不了 ACTIVE_LINE，
        // 重算会把刚点中的高亮立刻跳走；解锁后下一次用户滚动会自然接管
        settleTimerRef.current = window.setTimeout(() => {
          lockedIndexRef.current = null;
        }, 150);
      }
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
      window.clearTimeout(settleTimerRef.current);
      lockedIndexRef.current = null;
    };
  }, [current]);

  // 量出每个条目的位置。ResizeObserver 挂上时会先回调一次，之后条目折行变化（窗口变宽变窄）再量
  useEffect(() => {
    const list = listRef.current;
    const win = windowRef.current;
    if (!current || !list || !win) return;
    const { key, items } = current;
    const observer = new ResizeObserver(() => {
      const rows = rowRefs.current.slice(0, items.length);
      setLayout({
        key,
        tops: rows.map((row) => row?.offsetTop ?? 0),
        heights: rows.map((row) => row?.offsetHeight ?? 0),
        listHeight: list.offsetHeight,
        windowHeight: win.clientHeight,
      });
    });
    observer.observe(list);
    observer.observe(win);
    return () => observer.disconnect();
  }, [current]);

  // 把当前一节转到窗口中央。换文章后的第一次直接就位，不从上一篇的位置转过来；
  // 鼠标悬停在目录内时暂停随正文滚动的自动旋转，避免惯性滚动未停时条目在指针下移动
  useEffect(() => {
    if (!wheel) return;
    const target = offsetFor(wheel, activeIndex);
    if (placedKeyRef.current !== wheel.key) {
      placedKeyRef.current = wheel.key;
      offset.set(target);
      return;
    }
    if (browsing || hovering) return;
    if (reduceMotion) {
      offset.set(target);
      return;
    }
    const controls = animate(offset, target, SPIN);
    return () => controls.stop();
  }, [wheel, browsing, hovering, activeIndex, offset, reduceMotion]);

  // 跟着位移更新两端的渐隐和球面弯曲。只在还有内容的那一端生效，强度随藏起来的长度渐变
  useEffect(() => {
    const win = windowRef.current;
    if (!wheel || !win) return;
    const rows = rowRefs.current.slice(0, wheel.tops.length);
    const half = wheel.windowHeight / 2;
    const fadeZone = wheel.windowHeight * FADE_RATIO;
    const apply = (value: number) => {
      const top = clamp(-value / fadeZone, 0, 1);
      const bottom = clamp((wheel.listHeight + value - wheel.windowHeight) / fadeZone, 0, 1);
      win.style.setProperty('--toc-fade-top', `${top * FADE_RATIO * 100}%`);
      win.style.setProperty('--toc-fade-bottom', `${bottom * FADE_RATIO * 100}%`);
      rows.forEach((row, i) => {
        if (!row) return;
        const fromCenter = wheel.tops[i] + wheel.heights[i] / 2 + value - half;
        const u = Math.min(1, Math.abs(fromCenter) / half) * (fromCenter < 0 ? top : bottom);
        row.style.transform =
          u === 0 ? '' : `translateX(${(CURVE_SHIFT * u * u).toFixed(2)}px) scale(${(1 - CURVE_SCALE * u * u).toFixed(4)})`;
      });
    };
    apply(offset.get());
    return offset.on('change', apply);
  }, [wheel, offset]);

  // 鼠标在目录上转滚轮时转动目录本身，而不是滚动页面
  useEffect(() => {
    const win = windowRef.current;
    if (!wheel || !win || wheel.listHeight <= wheel.windowHeight) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      offset.stop();
      offset.set(clamp(offset.get() - delta, wheel.windowHeight - wheel.listHeight, 0));
      setBrowsing(true);
    };
    win.addEventListener('wheel', onWheel, { passive: false });
    return () => win.removeEventListener('wheel', onWheel);
  }, [wheel, offset]);

  // 鼠标和键盘焦点都离开目录一会儿之后，转回当前一节
  useEffect(() => {
    if (!browsing || hovering || focusInside) return;
    const timer = window.setTimeout(() => setBrowsing(false), SNAP_BACK_MS);
    return () => window.clearTimeout(timer);
  }, [browsing, hovering, focusInside]);

  if (!current || current.items.length < 2) return null;

  // 键盘逐项浏览时，把聚焦的那一项转到中央，免得它停在被淡出或裁掉的位置
  const browseToFocused = (event: FocusEvent<HTMLElement>) => {
    const index = Number((event.target as HTMLElement).dataset.tocIndex);
    if (!wheel || Number.isNaN(index) || !(event.target as HTMLElement).matches(':focus-visible')) return;
    setFocusInside(true);
    setBrowsing(true);
    animate(offset, offsetFor(wheel, index), reduceMotion ? { duration: 0 } : SPIN);
  };
  const leaveFocus = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
  };

  const jump = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    // 带修饰键的点击（新标签页打开等）交给浏览器
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const heading = current.headings[index];
    if (!heading) return;
    event.preventDefault();
    lockedIndexRef.current = index;
    window.clearTimeout(settleTimerRef.current);
    // 目标若已在位（不触发 scroll 事件），兜底解锁，免得锁一直留到下次滚动
    settleTimerRef.current = window.setTimeout(() => {
      lockedIndexRef.current = null;
    }, 200);
    setActiveIndex(index);
    setBrowsing(false);
    if (wheel) {
      animate(offset, offsetFor(wheel, index), reduceMotion ? { duration: 0 } : SPIN);
    }
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const activeSection = activeItem?.section;
  const indicatorIndex = Math.max(0, activeIndex);

  return (
    // 右边缘停在卡片左边缘（页面中线左侧 480px）再往左 28px；宽度扣掉这段距离和离视口左边的 20px
    <aside className="absolute inset-y-0 right-[calc(50%_+_508px)] w-[min(15rem,calc(50vw_-_528px))]">
      {/* 窗口高 --toc-h 取视口高度的 70%，矮屏上至少给上下各留约 4rem，最矮 20rem、最高 44rem；
          竖直居中在导航栏以下的区域（中线比视口中线低 2rem） */}
      <nav
        aria-label="文章目录"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocus={browseToFocused}
        onBlur={leaveFocus}
        className="toc-reveal sticky top-[calc(50vh_+_2rem_-_var(--toc-h)_*_0.5)] [--toc-h:clamp(20rem,min(70vh,calc(100vh_-_12rem)),44rem)]"
      >
        {/* pl-1：窗口会裁切溢出，竖线上的高亮条比竖线宽，不留边会被切掉一半 */}
        <div ref={windowRef} className="toc-wheel h-[var(--toc-h)] overflow-hidden pl-1">
          <motion.div ref={listRef} style={{ y: offset }} className="relative border-l border-border">
            {wheel && (
              <motion.span
                aria-hidden="true"
                className="absolute left-[-1.5px] top-0 w-0.5 rounded-full bg-primary"
                initial={false}
                animate={{
                  y: wheel.tops[indicatorIndex] + 4,
                  height: Math.max(0, wheel.heights[indicatorIndex] - 8),
                  opacity: activeIndex >= 0 ? 1 : 0,
                }}
                transition={reduceMotion ? { duration: 0 } : SPIN}
              />
            )}
            <ol>
              {current.items.map((item, index) => {
                const isActive = index === activeIndex;
                const isActiveSection = item.level === 2 && item.id === activeSection;
                return (
                  <li
                    key={item.id}
                    ref={(node) => {
                      rowRefs.current[index] = node;
                    }}
                    className="origin-left"
                  >
                    <a
                      href={`#${item.id}`}
                      title={item.text}
                      data-toc-index={index}
                      aria-current={isActive ? 'location' : undefined}
                      onClick={(event) => jump(event, index)}
                      className={`block rounded-sm py-1 leading-5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        item.level === 2 ? 'pl-3 text-[13px]' : 'pl-6 text-[12.5px]'
                      } ${
                        isActive
                          ? 'font-medium text-primary'
                          : isActiveSection
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="line-clamp-2 break-words">{item.text}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </div>
      </nav>
    </aside>
  );
}
