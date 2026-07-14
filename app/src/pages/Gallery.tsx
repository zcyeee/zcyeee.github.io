import { motion, useReducedMotion, type Transition } from 'framer-motion';
import {
  Aperture,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  X,
} from 'lucide-react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { useState, useEffect, useMemo } from 'react';
import { photos, categories, type Photo } from '@/data/gallery';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function getPreviewSrc(photo: Photo) {
  try {
    const url = new URL(photo.src);
    if (url.hostname === 'images.unsplash.com') {
      const previewWidth = 1600;
      url.searchParams.set('w', String(previewWidth));
      url.searchParams.set('h', String(Math.round(previewWidth * photo.height / photo.width)));
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('auto', 'format');
      url.searchParams.set('q', '85');
    }
    return url.toString();
  } catch {
    return photo.src;
  }
}

export function Gallery() {
  const [columnCount, setColumnCount] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) {
        setColumnCount(1);
      } else if (window.innerWidth < 1024) {
        setColumnCount(2);
      } else {
        setColumnCount(3);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const filteredPhotos = useMemo(() => {
    if (selectedCategory === '全部') {
      return photos;
    }
    return photos.filter((photo) => photo.category === selectedCategory);
  }, [selectedCategory]);

  const columns = useMemo(() => {
    const cols: Photo[][] = Array.from({ length: columnCount }, () => []);
    filteredPhotos.forEach((photo, i) => {
      cols[i % columnCount].push(photo);
    });
    return cols;
  }, [columnCount, filteredPhotos]);

  const selectedPhotoIndex = selectedPhoto
    ? filteredPhotos.findIndex((photo) => photo.id === selectedPhoto.id)
    : -1;
  const canNavigate = filteredPhotos.length > 1 && selectedPhotoIndex >= 0;
  const hoverTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', bounce: 0, duration: 0.35 };

  const openPreview = (photo: Photo) => {
    setSelectedPhoto(photo);
    setIsPreviewOpen(true);
  };

  const showPreviousPhoto = () => {
    if (!canNavigate) return;
    const previousIndex = (selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    setSelectedPhoto(filteredPhotos[previousIndex]);
  };

  const showNextPhoto = () => {
    if (!canNavigate) return;
    const nextIndex = (selectedPhotoIndex + 1) % filteredPhotos.length;
    setSelectedPhoto(filteredPhotos[nextIndex]);
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
          <div className="flex gap-4">
            {columns.map((col, colIndex) => (
              <div key={colIndex} className="flex-1 flex flex-col gap-4">
                {col.map((photo, index) => (
                  <AnimatedSection key={photo.id} delay={(index + colIndex) * 0.05} className="break-inside-avoid" amount={0} margin="50px">
                    <motion.div
                      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                      transition={hoverTransition}
                    >
                      <button
                        type="button"
                        onClick={() => openPreview(photo)}
                        aria-label={`查看大图：${photo.title}`}
                        className="group relative block w-full overflow-hidden rounded-2xl border border-border/30 bg-muted text-left shadow-md outline-none transition-[border-color,box-shadow] duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        style={{ aspectRatio: photo.width / photo.height }}
                      >
                        <img
                          src={photo.src}
                          alt={photo.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                        />

                        {/* A compact caption stays visible on touch devices; details appear on hover/focus. */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 via-55% to-transparent"
                        >
                          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                            {photo.title && (
                              <h3 className="text-base font-semibold leading-tight drop-shadow-sm sm:text-lg">
                                {photo.title}
                              </h3>
                            )}
                            <div className="mt-2 hidden translate-y-2 flex-wrap gap-2 text-xs text-white/90 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:flex motion-reduce:transform-none motion-reduce:transition-none">
                              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-2 py-1 rounded-md">
                                <MapPin className="w-3.5 h-3.5" />
                                {photo.location}
                              </span>
                              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-2 py-1 rounded-md">
                                <Calendar className="w-3.5 h-3.5" />
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
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        {selectedPhoto && (
          <DialogContent
            showCloseButton={false}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                showPreviousPhoto();
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                showNextPhoto();
              }
            }}
            className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-2xl border-white/15 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-5xl motion-reduce:duration-0"
          >
            <DialogClose
              aria-label="关闭大图预览"
              className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <X className="size-5" />
              <span className="sr-only">关闭大图预览</span>
            </DialogClose>

            <div className="relative flex min-h-48 items-center justify-center overflow-hidden bg-black">
              <img
                src={getPreviewSrc(selectedPhoto)}
                alt={selectedPhoto.title}
                className="block max-h-[72vh] w-full object-contain"
              />

              {canNavigate && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousPhoto}
                    aria-label="查看上一张照片"
                    className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:left-4"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextPhoto}
                    aria-label="查看下一张照片"
                    className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:right-4"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
            </div>

            <DialogHeader className="gap-2 px-4 pb-4 pt-4 text-left sm:px-6 sm:pb-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {selectedPhoto.category}
                </span>
                {selectedPhotoIndex >= 0 && (
                  <span aria-live="polite">
                    {selectedPhotoIndex + 1} / {filteredPhotos.length}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl leading-tight sm:text-2xl">
                {selectedPhoto.title}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {selectedPhoto.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  {selectedPhoto.date}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Aperture className="size-3.5" aria-hidden="true" />
                  {selectedPhoto.camera}
                </span>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
