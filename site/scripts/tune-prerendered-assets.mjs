/**
 * 调整预渲染 HTML 里的资源加载。在 react-snap 之后执行，做两件事。
 *
 * 一、摘掉 `<link rel="modulepreload">`。
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
 *
 * 二、主包改为首帧画出来之后再请求。
 * 页面内容都已预渲染，首帧只需要 HTML 与 CSS；主包（约 170 KB gzip）只负责接管交互。
 * 但 `<script type="module">` 写在 <head> 里时，浏览器会和 CSS 同时请求它。国内手机直连
 * GitHub Pages 的吞吐常常只有每秒几十 KB，跨境链路的缓冲又深，先发出的主包字节会堵在
 * CSS 前面：实测 30 KB/s 下首帧从 1.3s 拖到 7.5s，桌面端带宽充足所以察觉不到。
 * 改成内联小脚本：rAF 要等阻塞渲染的 CSS 到齐才会触发，再隔一个 setTimeout 就在首帧之后。
 * 必须在 react-snap 之后做 —— 快照会把动态插入的 <script> 一起序列化进去。
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(HERE, '../dist');

const MODULEPRELOAD_LINK = /[ \t]*<link\b[^>]*\brel="modulepreload"[^>]*>\n?/gi;
const ENTRY_SCRIPT = /<script type="module" crossorigin(?:="")? src="([^"]+)"><\/script>/;

const deferredEntry = (src) =>
  '<script>requestAnimationFrame(() => setTimeout(() => {' +
  " const s = document.createElement('script'); s.type = 'module'; s.crossOrigin = '';" +
  ` s.src = ${JSON.stringify(src)}; document.head.appendChild(s);` +
  ' }));</script>';

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
let preloadFiles = 0;
let preloadsRemoved = 0;
let entriesDeferred = 0;

for (const file of files) {
  const original = await readFile(file, 'utf-8');
  let html = original;

  const preloads = html.match(MODULEPRELOAD_LINK);
  if (preloads) {
    html = html.replace(MODULEPRELOAD_LINK, '');
    preloadFiles += 1;
    preloadsRemoved += preloads.length;
  }

  const entry = html.match(ENTRY_SCRIPT);
  if (entry) {
    html = html.replace(entry[0], deferredEntry(entry[1]));
    entriesDeferred += 1;
  }

  if (html !== original) await writeFile(file, html, 'utf-8');
}

console.log(`已从 ${preloadFiles}/${files.length} 个 HTML 中移除 ${preloadsRemoved} 条 modulepreload`);
console.log(`已将 ${entriesDeferred}/${files.length} 个 HTML 的主包改为首帧后加载`);
if (entriesDeferred === 0) {
  throw new Error('没找到主包的 <script type="module">，Vite 或 react-snap 的输出格式可能变了');
}
