/**
 * 从预渲染 HTML 里摘掉 `<link rel="modulepreload">`。在 react-snap 之后执行。
 *
 * react-snap 是在真实浏览器里跑页面再序列化 DOM 的。它渲染文章页时要动态加载 Markdown
 * 渲染栈（react-markdown + remark/rehype + KaTeX + highlight.js，约 233 KB gzip），
 * Vite 的 __vitePreload 顺手往 <head> 注入了一条 modulepreload —— 于是这条标签被一起
 * 拍进了快照，每次打开文章页浏览器都会以首屏优先级抢下整个块。
 *
 * 但线上根本用不到它：文章页首屏走预渲染 DOM 复用（src/lib/prerendered-article.ts），
 * 站内切换到别的文章也是直接复用那篇的预渲染 HTML（src/lib/article-html.ts）。
 * 渲染栈只在开发环境和取不到预渲染 HTML 时的回退路径上才会加载。
 *
 * 注意只摘 modulepreload。同样被注入的 `<link rel="stylesheet">` 必须保留 ——
 * KaTeX 与代码高亮的样式表在那个异步块里，少了它预渲染好的公式和代码块就没有样式。
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(HERE, '../dist');

const MODULEPRELOAD_LINK = /[ \t]*<link\b[^>]*\brel="modulepreload"[^>]*>\n?/gi;

async function collectHtmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      found.push(...(await collectHtmlFiles(full)));
    } else if (entry.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

const files = await collectHtmlFiles(DIST_DIR);
let touched = 0;
let removed = 0;

for (const file of files) {
  const html = await readFile(file, 'utf-8');
  const matches = html.match(MODULEPRELOAD_LINK);
  if (!matches) continue;
  await writeFile(file, html.replace(MODULEPRELOAD_LINK, ''), 'utf-8');
  touched += 1;
  removed += matches.length;
}

console.log(`已从 ${touched}/${files.length} 个 HTML 中移除 ${removed} 条 modulepreload`);
