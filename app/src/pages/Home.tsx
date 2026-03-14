import { motion, AnimatePresence } from 'framer-motion';
import { personalInfo, education, experiences, projects, awards, skills, research } from '@/data/profile';
import { MapPin, Mail, Github, Linkedin, ExternalLink, Award, Briefcase, Code, GraduationCap, Sparkles, Cpu, MessageCircle, FileText, X, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedSection, ScaleOnHover } from '@/components/AnimatedSection';
import { useState } from 'react';

export function Home() {
  const [wechatOpen, setWechatOpen] = useState(false);
  const awardListVariants = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };
  const awardItemVariants = {
    hidden: { opacity: 0, x: -16 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
    },
  };
  const renderAuthors = (authors: string) => {
    const highlightName = 'Chenyang Zhang';
    const scholarUrl = 'https://scholar.google.com/citations?user=CtwaMOQAAAAJ&hl=zh-CN';
    const parts = authors.split(highlightName);
    if (parts.length === 1) {
      return authors;
    }
    return (
      <>
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < parts.length - 1 && (
              <a
                href={scholarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-primary"
              >
                {highlightName}
              </a>
            )}
          </span>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative py-9 md:py-13">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Avatar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="relative"
              >
                <motion.div
                  className="w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-2xl"
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={personalInfo.avatar}
                    alt={personalInfo.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="absolute -bottom-1 -right-1 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </motion.div>

                {/* Decorative ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/20"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.div>

              {/* Info */}
              <div className="text-center md:text-left flex-1">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold mb-2 tracking-wide bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent"
                >
                  {personalInfo.name}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-sm md:text-base text-muted-foreground mb-3 italic"
                >
                  {personalInfo.motto}
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-xs md:text-sm text-muted-foreground/80 max-w-2xl mb-4 leading-relaxed px-2 md:px-0"
                >
                  {personalInfo.bio}
                </motion.p>

                {/* Contact Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4"
                >
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" />
                    {personalInfo.location}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    <Mail className="w-3 h-3" />
                    {personalInfo.email}
                  </div>
                </motion.div>

                {/* Social Links - All buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-2"
                >
                  {/* WeChat - desktop only, first in row */}
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} className="hidden md:inline-flex">
                    <button
                      onClick={() => setWechatOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-600 hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-200 text-xs font-medium cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>欢迎交流</span>
                    </button>
                  </motion.div>
                  {personalInfo.github && (
                    <motion.a
                      href={personalInfo.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                        <Github className="w-3.5 h-3.5" />
                        GitHub
                      </Button>
                    </motion.a>
                  )}
                  {personalInfo.linkedin && (
                    <motion.a
                      href={personalInfo.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                        <Linkedin className="w-3.5 h-3.5" />
                        LinkedIn
                      </Button>
                    </motion.a>
                  )}
                  {personalInfo.googleScholar && (
                    <motion.a
                      href={personalInfo.googleScholar}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        Scholar
                      </Button>
                    </motion.a>
                  )}


                </motion.div>

                {/* WeChat - mobile only, separate row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="mt-3 md:hidden"
                >
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} className="inline-flex">
                    <button
                      onClick={() => setWechatOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-600 hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-200 text-xs font-medium cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>欢迎交流</span>
                    </button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* WeChat Modal */}
        <AnimatePresence>
          {wechatOpen && (
            <motion.div
              key="wechat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setWechatOpen(false)}
            >
              <motion.div
                key="wechat-modal"
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-background rounded-2xl shadow-2xl p-2 w-64 sm:w-80 max-w-[90vw] max-h-[85vh] overflow-y-auto border border-border/40"
              >
                <button
                  onClick={() => setWechatOpen(false)}
                  className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-center font-semibold text-sm mb-1.5 pt-1">祝你天天开心</h3>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full rounded-xl overflow-hidden">
                    <img
                      src="/images/wechat_qr.jpg"
                      alt="微信二维码"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center pb-1">
                    微信号: zcy13863822523
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skills Section */}
        <section className="py-6 md:py-8 bg-muted/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="flex items-center gap-3 mb-4 md:mb-5">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Cpu className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold">专业技能</h2>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <ScaleOnHover scale={1.01}>
                {/* shadow-sm + border-border/30：白色背景下也能看清卡片层次 */}
                <Card className="group shadow-sm hover:shadow-md transition-all duration-300 border-border/30 hover:border-primary/20">
                  <CardContent className="p-4 md:p-5">
                    <ul className="space-y-2.5">
                      {skills.map((skill, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {skill}
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </ScaleOnHover>
            </AnimatedSection>
          </div>
        </section>

        {/* Education Section */}
        <section className="py-6 md:py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="flex items-center gap-3 mb-4 md:mb-5">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <GraduationCap className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold">教育背景</h2>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {education.map((edu, index) => (
                <AnimatedSection key={index} delay={index * 0.1}>
                  <ScaleOnHover scale={1.01}>
                    {/* 淡边框 + 轻阴影，hover 时加深以突出交互 */}
                    <Card className="group shadow-sm hover:shadow-md transition-all duration-300 border-border/30 hover:border-primary/20 h-full">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col gap-2.5">
                          {/* School name + date */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base md:text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                              {edu.school}
                            </h3>
                            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap mt-0.5">
                              {edu.startDate} — {edu.endDate}
                            </span>
                          </div>
                          {/* Degree + field */}
                          <p className="text-sm font-medium text-foreground/60">
                            {edu.degree} · {edu.field}
                          </p>
                          {/* Department */}
                          {edu.department && (
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                              <span className="text-xs text-muted-foreground/70">{edu.department}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </ScaleOnHover>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section className="py-6 md:py-8 bg-muted/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="flex items-center gap-3 mb-4 md:mb-5">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Briefcase className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold">实习经历</h2>
            </AnimatedSection>

            <div className="space-y-4 md:space-y-5">
              {experiences.map((exp, index) => (
                <AnimatedSection key={index} delay={index * 0.1}>
                  <ScaleOnHover scale={1.01}>
                    {/* 淡边框 + 轻阴影，hover 时加深以突出交互 */}
                    <Card className="group shadow-sm hover:shadow-md transition-all duration-300 border-border/30 hover:border-primary/20">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col gap-2.5">
                          {/* Header */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base md:text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                                {exp.company}
                              </h3>
                              <span className="text-xs md:text-sm text-muted-foreground text-right whitespace-nowrap mt-0.5">
                                {exp.startDate} — {exp.endDate}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium text-foreground/60">
                                {exp.position}
                              </span>
                              {exp.location && (
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground/70">
                                  <MapPin className="w-3 h-3" />
                                  {exp.location}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <ul className="space-y-1.5">
                            {exp.description.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </ScaleOnHover>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section className="py-6 md:py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="flex items-center gap-3 mb-4 md:mb-5">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Code className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold">项目经历</h2>
            </AnimatedSection>

            <div className="space-y-4 md:space-y-5">
              {projects.map((project, index) => (
                <AnimatedSection key={index} delay={index * 0.1}>
                  <ScaleOnHover scale={1.01}>
                    {/* 淡边框 + 轻阴影，hover 时加深以突出交互 */}
                    <Card className="group shadow-sm hover:shadow-md transition-all duration-300 border-border/30 hover:border-primary/20 overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Image */}
                          <div className="w-full md:w-40 lg:w-44 h-28 md:h-auto flex-shrink-0 overflow-hidden">
                            <motion.img
                              src={project.image}
                              alt={project.name}
                              className="w-full h-full object-cover md:scale-110"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-4 md:p-5">
                            {/* Title row */}
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-1.5">
                              <h3 className="text-base md:text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                                {project.github ? (
                                  <a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {project.name}
                                  </a>
                                ) : (
                                  project.name
                                )}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {project.stars !== undefined && (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                                    <Star className="w-3 h-3 fill-current" />
                                    {project.stars}
                                  </span>
                                )}
                                {project.github && (
                                  <motion.a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs px-2.5">
                                      <Github className="w-3.5 h-3.5" />
                                      源码
                                    </Button>
                                  </motion.a>
                                )}
                                {project.link && (
                                  <motion.a
                                    href={project.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs px-2.5">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      演示
                                    </Button>
                                  </motion.a>
                                )}
                              </div>
                            </div>

                            {/* Date */}
                            {project.date && (
                              <p className="text-xs text-muted-foreground/70 mb-2">{project.date}</p>
                            )}

                            <p className="text-xs md:text-sm text-muted-foreground mb-3">
                              {project.description}
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {project.technologies.map((tech) => (
                                <Badge key={tech} variant="secondary" className="text-xs font-normal px-2 py-0.5">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScaleOnHover>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Research Section - After Projects */}
        <section className="py-6 md:py-8 bg-muted/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="flex items-center gap-3 mb-4 md:mb-5">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <FileText className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold">科研经历</h2>
            </AnimatedSection>

            <div className="space-y-4 md:space-y-5">
              {research.map((paper, index) => (
                <AnimatedSection key={index} delay={index * 0.1}>
                  <ScaleOnHover scale={1.01}>
                    {/* 淡边框 + 轻阴影，hover 时加深以突出交互 */}
                    <Card className="group shadow-sm hover:shadow-md transition-all duration-300 border-border/30 hover:border-primary/20">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-base md:text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                              {paper.link ? (
                                <a
                                  href={paper.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {paper.title}
                                </a>
                              ) : (
                                paper.title
                              )}
                            </h3>
                            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {paper.year}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground/80">{renderAuthors(paper.authors)}</p>
                          <p className="text-sm md:text-base text-foreground/70 italic">{paper.venue}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {paper.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs font-normal px-2 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScaleOnHover>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Awards Section */}
        <section className="py-6 md:py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="flex items-center gap-3 mb-4 md:mb-5">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Award className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold">荣誉奖项</h2>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <Card className="group shadow-sm hover:shadow-md transition-all duration-300 border-border/30 hover:border-primary/20">
                <CardContent className="p-3 md:p-4">
                  <motion.div
                    className="divide-y divide-border/30"
                    variants={awardListVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2, margin: '-80px' }}
                  >
                    {awards.map((award, index) => (
                      <motion.div
                        key={index}
                        variants={awardItemVariants}
                        whileHover={{ x: 6 }}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1 group/item cursor-default"
                      >
                        <span className="text-sm md:text-[15px] font-medium text-foreground/80 truncate group-hover/item:text-primary transition-colors duration-300">{award.title}</span>
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                          <span className="text-sm text-muted-foreground hidden sm:inline group-hover/item:text-foreground/70 transition-colors duration-300">{award.organization}</span>
                          <span className="text-xs md:text-sm text-muted-foreground tabular-nums w-[72px] text-right inline-block whitespace-nowrap group-hover/item:text-foreground/70 transition-colors duration-300">
                            {award.date}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </section>
      </div>
    </div>
  );
}
