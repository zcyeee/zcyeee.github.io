/**
 * frontmatter 解析与阅读时长计算。
 *
 * 这份逻辑有两个调用方，必须共用同一份实现：
 *   1. 构建期：Vite 插件（Node 环境）处理 `*.md?frontmatter`，只吐出元数据，
 *      顺便把 readTime 算好 —— 因为正文已经分包出去了，浏览器侧再也拿不到全文。
 *   2. 运行期：浏览器按篇懒加载到正文后，用 parseFrontmatter 把头部剥掉再渲染。
 *
 * 所以这里不能有任何依赖，也不能引用 DOM 或 Node 的 API。
 * 改动务必谨慎：readTime 是构建期算的，逻辑一变，全站文章的"X 分钟"就会跟着变。
 */

export interface Frontmatter {
  data: Record<string, unknown>;
  content: string;
}

/** 轻量 YAML frontmatter 解析，只覆盖本站用到的标量与单行数组两种形态 */
export function parseFrontmatter(raw: string): Frontmatter {
  if (!raw.startsWith('---')) return { data: {}, content: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, content: raw };

  const yamlBlock = raw.slice(4, end);
  const content = raw.slice(end + 4).replace(/^\n/, '');
  const data: Record<string, unknown> = {};

  for (const line of yamlBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (!key) continue;
    data[key] = val.startsWith('[')
      ? val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      : val.replace(/^["']|["']$/g, '');
  }
  return { data, content };
}

/**
 * 按中西文分别估算阅读时长。CJK 按 300 字/分钟，西文按 200 词/分钟，下限 1 分钟。
 * frontmatter 里显式写了 readTime 的文章不走这里。
 */
export function calculateReadTime(content: string): string {
  // 粗略去掉 markdown 符号，让字数统计更接近正文
  const text = content.replace(/[#*`~_>-]/g, '');

  const cjkCount = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const westernCount = (text.match(/[a-zA-Z0-9]+/g) || []).length;

  const totalMinutes = Math.max(1, Math.ceil(cjkCount / 300 + westernCount / 200));
  return `${totalMinutes} 分钟`;
}

/** 文章元数据：`*.md?frontmatter` 这个虚拟模块的默认导出形态 */
export interface PostFrontmatter {
  title?: string;
  date?: string;
  readTime: string;
  tags: string[];
  category: string;
  excerpt: string;
}

/** 从整篇原文提取元数据。构建期插件与测试共用，保证 readTime 口径一致。 */
export function extractPostFrontmatter(raw: string): PostFrontmatter {
  const { data, content } = parseFrontmatter(raw);
  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    date: typeof data.date === 'string' ? data.date : undefined,
    readTime: (typeof data.readTime === 'string' && data.readTime) || calculateReadTime(content),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    category: (typeof data.category === 'string' && data.category) || '未分类',
    excerpt: typeof data.excerpt === 'string' ? data.excerpt : '',
  };
}
