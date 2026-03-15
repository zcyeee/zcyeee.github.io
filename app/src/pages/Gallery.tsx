import { motion } from 'framer-motion';
import { Camera, MapPin, Calendar } from 'lucide-react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { useState, useEffect, useMemo } from 'react';
import { photos, categories, type Photo } from '@/data/gallery';

export function Gallery() {
  const [columnCount, setColumnCount] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState('全部');

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
  const hoverTransition = { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={hoverTransition}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors
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
                      whileHover={{ y: -4 }}
                      transition={hoverTransition}
                    >
                      <div
                        className="group relative overflow-hidden rounded-2xl bg-muted cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                        style={{ aspectRatio: photo.width / photo.height }}
                      >
                        <img
                          src={photo.src}
                          alt={photo.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            {photo.title && <h3 className="text-xl font-bold mb-3 tracking-wide">{photo.title}</h3>}
                            <div className="flex flex-wrap gap-4 text-sm text-white/90">
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

                        {/* Category Badge */}
                        <div className="absolute top-4 left-4 transform -translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/90 text-black backdrop-blur-md shadow-sm">
                            {photo.category}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatedSection>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
