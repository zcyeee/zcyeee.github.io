import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { Calendar, Camera, MapPin, Maximize2, X } from 'lucide-react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { photos, categories, type Photo } from '@/data/gallery';
import { useSeo } from '@/hooks/use-seo';
import { isReactSnapPrerender } from '@/lib/prerender';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// The preview never fills the viewport edge to edge, so the frosted frame stays visible.
const PREVIEW_PHOTO_MAX_HEIGHT = 'calc(100svh - 2rem)';

// What max-w-6xl leaves for the grid at the widest breakpoint. Only a starting guess for the
// first render, before the real width is measured.
const ASSUMED_GRID_WIDTH = 1088;

/**
 * Groups photos into rows that share one height, the way photo galleries usually lay out mixed
 * orientations: a column grid fixes the width, which hands portrait shots far more area than
 * landscape ones. Rows are filled until their combined aspect ratio reaches what the target
 * height allows; the row then stretches to the container, so wide photos end up wide.
 */
function packRows(items: Photo[], containerWidth: number) {
  const ratioOf = (photo: Photo) => photo.width / photo.height;
  // One photo per row on phones: side by side they would be too small to read.
  if (containerWidth < 640) {
    return items.map((photo) => ({ items: [{ photo, grow: 1 }], spacerGrow: 0 }));
  }

  const targetRatio = containerWidth / (containerWidth < 900 ? 260 : 300);
  const rows: { items: { photo: Photo; grow: number }[]; spacerGrow: number }[] = [];
  let row: Photo[] = [];
  let ratioSum = 0;

  // Flex only hands out all of the free space once the grow factors sum to 1, so they are scaled
  // rather than used raw. A trailing row divides by the target instead, which keeps it at the
  // shared row height and lets the spacer swallow the leftover width.
  const closeRow = (photos: Photo[], sum: number, divisor: number) => {
    rows.push({
      items: photos.map((photo) => ({ photo, grow: ratioOf(photo) / divisor })),
      spacerGrow: Math.max((divisor - sum) / divisor, 0),
    });
  };

  for (const photo of items) {
    const ratio = ratioOf(photo);
    // Close before taking this photo when stopping here lands nearer the target row height.
    if (row.length > 0 && Math.abs(ratioSum - targetRatio) <= Math.abs(ratioSum + ratio - targetRatio)) {
      closeRow(row, ratioSum, ratioSum);
      row = [];
      ratioSum = 0;
    }
    row.push(photo);
    ratioSum += ratio;
  }

  if (row.length > 0) {
    closeRow(row, ratioSum, Math.max(targetRatio, ratioSum));
  }

  return rows;
}

function getPreviewSrc(photo: Photo) {
  try {
    const url = new URL(photo.src);
    if (url.hostname === 'images.unsplash.com') {
      const previewWidth = 1600;
      url.searchParams.set('w', String(previewWidth));
      url.searchParams.set('h', String(Math.round(previewWidth * photo.height / photo.width)));
      // "max" scales the photo down into that box instead of cropping it to fill the box.
      url.searchParams.set('fit', 'max');
      url.searchParams.set('auto', 'format');
      url.searchParams.set('q', '85');
    }
    return url.toString();
  } catch {
    return photo.src;
  }
}

export function Gallery() {
  useSeo({ title: 'Photography', description: '旅行与日常的摄影记录。', path: '/gallery' });
  const [gridWidth, setGridWidth] = useState(ASSUMED_GRID_WIDTH);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [previewRatio, setPreviewRatio] = useState(1);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const prefetchedPreviews = useRef(new Set<string>());
  // A photo's declared size can disagree with the file; once measured, the truth wins.
  const measuredRatios = useRef(new Map<string, number>());
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // 同 useIsMobile：预渲染时不测量，让快照保持 ASSUMED_GRID_WIDTH 的排布，
    // 与真实浏览器 hydration 的首帧一致，否则整页会被判定 hydration 失败而重渲染。
    if (isReactSnapPrerender()) return;
    const node = gridRef.current;
    if (!node) return;

    const measure = () => setGridWidth(node.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const filteredPhotos = useMemo(() => {
    if (selectedCategory === '全部') {
      return photos;
    }
    return photos.filter((photo) => photo.category === selectedCategory);
  }, [selectedCategory]);

  const rows = useMemo(() => packRows(filteredPhotos, gridWidth), [filteredPhotos, gridWidth]);

  const hoverTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', bounce: 0, duration: 0.35 };

  // The photo and everything layered on it appear together once the image is decoded.
  const previewFade = `transition-opacity duration-500 ease-out motion-reduce:transition-none ${
    isPreviewLoaded ? 'opacity-100' : 'opacity-0'
  }`;

  const rememberRatio = (photoId: string, image: HTMLImageElement) => {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      measuredRatios.current.set(photoId, image.naturalWidth / image.naturalHeight);
    }
  };

  // Warm the browser cache while the pointer is still on the card, so the preview opens instantly.
  const prefetchPreview = (photo: Photo) => {
    const src = getPreviewSrc(photo);
    if (prefetchedPreviews.current.has(src)) return;
    prefetchedPreviews.current.add(src);
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => rememberRatio(photo.id, image));
    image.src = src;
  };

  const openPreview = (photo: Photo) => {
    setSelectedPhoto(photo);
    setPreviewRatio(measuredRatios.current.get(photo.id) ?? photo.width / photo.height);
    setIsPreviewLoaded(false);
    setIsPreviewOpen(true);
  };

  const revealPreview = (photoId: string, image: HTMLImageElement) => {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
    rememberRatio(photoId, image);
    setPreviewRatio(image.naturalWidth / image.naturalHeight);
    setIsPreviewLoaded(true);
  };

  return (
    <div className="min-h-screen pb-2">
      {/* Header */}
      <section className="pt-10 pb-6 md:pt-14 md:pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div
              className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={hoverTransition}
            >
              <Camera className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">摄影照片</h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              定格日常生活和美好回忆
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Categories */}
      <section className="pt-2 pb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <motion.button
                  key={category}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                  transition={hoverTransition}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsPreviewOpen(false);
                  }}
                  aria-pressed={selectedCategory === category}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium outline-none transition-colors
                    focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    ${selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {category}
                </motion.button>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Photo Grid */}
      <section className="py-6 md:py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={gridRef} className="flex flex-col gap-4">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-4">
                {row.items.map(({ photo, grow }, index) => (
                  // Growing by aspect ratio gives every photo in the row the same height.
                  <div key={photo.id} className="min-w-0" style={{ flex: `${grow} 1 0` }}>
                    <AnimatedSection delay={(rowIndex + index) * 0.05} amount={0} margin="50px">
                      <motion.div
                        whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                        transition={hoverTransition}
                      >
                        <button
                          type="button"
                          onClick={() => openPreview(photo)}
                          onMouseEnter={() => prefetchPreview(photo)}
                          onFocus={() => prefetchPreview(photo)}
                          aria-label={`查看大图：${photo.title}`}
                          className="group relative block aspect-[var(--photo-ratio)] w-full overflow-hidden rounded-2xl border border-border/30 bg-muted text-left shadow-md outline-none transition-[border-color,box-shadow] duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          // 不能直接写 aspectRatio：react-snap 的 Chromium 78 不认识它，快照里会被丢掉，
                          // hydration 又不修正属性差异，线上就一直没有比例。自定义属性能原样留在快照里。
                          style={{ '--photo-ratio': photo.width / photo.height } as CSSProperties}
                        >
                          <img
                            src={photo.src}
                            alt={photo.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 via-45% to-transparent"
                          >
                            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 drop-shadow-sm sm:text-sm">
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin className="size-3.5" />
                                  {photo.location}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="size-3.5" />
                                  {photo.date}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/30 bg-black/25 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md">
                            {photo.category}
                          </span>
                          <span className="pointer-events-none absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white shadow-sm backdrop-blur-md">
                            <Maximize2 className="size-3.5" />
                          </span>
                        </button>
                      </motion.div>
                    </AnimatedSection>
                  </div>
                ))}
                {row.spacerGrow > 0 && (
                  <div aria-hidden="true" style={{ flex: `${row.spacerGrow} 1 0` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        {selectedPhoto && (
          <DialogContent
            showCloseButton={false}
            style={{
              // Match the dialog to the width the photo will actually take, so it frames the photo
              // instead of surrounding it with empty margins.
              width: `min(calc(100vw - 1rem), 80rem, max(14rem, calc(${PREVIEW_PHOTO_MAX_HEIGHT} * ${previewRatio})))`,
            }}
            className="flex max-h-[calc(100svh-1.5rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-3xl border-white/20 bg-white/5 p-0 shadow-[0_32px_90px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10 backdrop-blur-2xl transition-[width] duration-500 data-[state=open]:duration-500 data-[state=closed]:duration-300 sm:max-w-none motion-reduce:transition-none motion-reduce:data-[state=open]:duration-0 motion-reduce:data-[state=closed]:duration-0"
          >
            <DialogClose
              aria-label="关闭大图预览"
              className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <X className="size-5" />
              <span className="sr-only">关闭大图预览</span>
            </DialogClose>

            {/* Until the photo loads, its declared ratio reserves the right amount of space. */}
            <div
              style={{
                aspectRatio: isPreviewLoaded ? undefined : previewRatio,
                maxHeight: PREVIEW_PHOTO_MAX_HEIGHT,
              }}
              className={`relative flex min-h-24 shrink-0 items-center justify-center overflow-hidden ${
                isPreviewLoaded ? '' : 'animate-pulse bg-white/10 motion-reduce:animate-none'
              }`}
            >
              <img
                src={getPreviewSrc(selectedPhoto)}
                alt={selectedPhoto.title}
                onLoad={(event) => revealPreview(selectedPhoto.id, event.currentTarget)}
                // A cached image can finish loading before React attaches onLoad.
                ref={(image) => {
                  if (image?.complete) revealPreview(selectedPhoto.id, image);
                }}
                style={{ maxHeight: PREVIEW_PHOTO_MAX_HEIGHT }}
                className={`block h-auto w-auto max-w-full object-contain ${previewFade}`}
              />

              <span
                className={`pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md sm:left-4 sm:top-4 ${previewFade}`}
              >
                {selectedPhoto.category}
              </span>

              {/* Keeps the frosted caption legible over a bright photo. */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/35 to-transparent ${previewFade}`}
              />

              <DialogHeader
                className={`absolute inset-x-3 bottom-3 z-10 w-fit max-w-[calc(100%-1.5rem)] flex-row flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-left shadow-lg backdrop-blur-2xl sm:inset-x-4 sm:bottom-4 sm:max-w-[calc(100%-2rem)] sm:px-5 sm:py-2.5 ${previewFade}`}
              >
                <DialogTitle className="text-sm font-medium leading-tight text-white sm:text-base">
                  {selectedPhoto.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-tight text-white/70 sm:text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {selectedPhoto.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" aria-hidden="true" />
                    {selectedPhoto.date}
                  </span>
                </DialogDescription>
              </DialogHeader>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
