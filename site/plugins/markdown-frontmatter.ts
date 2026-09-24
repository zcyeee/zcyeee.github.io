import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import { extractPostFrontmatter } from '../src/content/frontmatter';

const QUERY = 'frontmatter';

/**
 * 让 `import x from './foo.md?frontmatter'` 只返回元数据，不带正文。
 *
 * 为什么需要它：posts-loader 的元数据层必须是 eager 的（列表页、归档页、导航栏标题
 * 都要同步拿到标题和日期），而 eager 引入 `?raw` 会把 23 篇文章的全文一起钉进主包 ——
 * 实测那是 493 KB 原始体积 / 171 KB gzip，首页一个字都用不上却要全部下载并解析。
 *
 * 这个插件把元数据和正文彻底切开：元数据每篇只剩几百字节留在主包里，正文交给
 * 非 eager 的 `?raw` glob，由 Vite 拆成按篇独立的 chunk，点开哪篇才下载哪篇。
 *
 * readTime 也必须在这里算完。正文分包之后浏览器侧再也拿不到全文，没法在运行时统计
 * 字数；放到构建期反而更好，运行时零开销。
 */
export function markdownFrontmatter(): Plugin {
  return {
    name: 'markdown-frontmatter',
    // 必须先于 Vite 内置的 asset / raw 处理，否则 .md 会被当成静态资源处理掉
    enforce: 'pre',
    async load(id) {
      const [filePath, rawQuery] = id.split('?');
      if (!filePath.endsWith('.md')) return null;
      if (!new URLSearchParams(rawQuery).has(QUERY)) return null;

      const raw = await readFile(filePath, 'utf-8');
      // 让 dev server 在 .md 改动时能失效这个虚拟模块
      this.addWatchFile(filePath);

      return {
        code: `export default ${JSON.stringify(extractPostFrontmatter(raw))};`,
        map: null,
      };
    },
  };
}
