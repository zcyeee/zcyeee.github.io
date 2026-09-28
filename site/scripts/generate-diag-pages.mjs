/**
 * 临时诊断页：排查 iPhone 上首页白屏约 5 秒的原因，定位后删除本文件及 package.json 里的调用。
 *
 * 以预渲染好的首页为底，每个变体只去掉一个可疑点，写到 dist/diag/<变体>/。
 * 所有变体都去掉了主包（不进 React，避免 /diag/* 路由被渲染成 404），
 * 并在打开 8 秒后于页面底部显示浏览器记录的各项时间。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(HERE, '../dist');

const NOINDEX = '<meta name="robots" content="noindex">';
// 放在 <head> 最前面：第一次渲染更新越晚，这里记下的 rAF 时间越晚
const HEAD_PROBE =
  '<script>window.__raf=[];(function f(){requestAnimationFrame(function(){__raf.push(Math.round(performance.now()));if(__raf.length<5)f();});})();</script>';

const overlay = (label) => `<script>setTimeout(function () {
  var n = performance.getEntriesByType('navigation')[0] || {};
  var p = performance.getEntriesByName('first-contentful-paint')[0];
  var css = performance.getEntriesByType('resource').filter(function (e) { return /\\.css/.test(e.name); }).map(function (e) { return Math.round(e.responseEnd); });
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;background:#111;color:#3f3;font:15px/1.5 ui-monospace,monospace;padding:10px 12px;border-radius:10px;white-space:pre-wrap';
  d.textContent = ${JSON.stringify(label)} +
    '\\n连接=' + Math.round(n.connectEnd - n.startTime) + '  html=' + Math.round(n.responseEnd) + '  css=' + (css.join(',') || '-') +
    '\\nFCP=' + (p ? Math.round(p.startTime) : '-') + '  DCL=' + Math.round(n.domContentLoadedEventEnd) + '  load=' + Math.round(n.loadEventEnd) +
    '\\nrAF=' + (window.__raf || []).join(',');
  var a = document.createElement('a');
  a.href = '/diag/'; a.textContent = '\\n← 返回列表'; a.style.color = '#8cf'; a.style.display = 'block';
  d.appendChild(a);
  document.body.appendChild(d);
}, 8000);</script>`;

const LOADER = /<script>requestAnimationFrame\(\(\) => setTimeout\(\(\) => \{[^<]*<\/script>/;
const INLINE_SCRIPT = /<script>[\s\S]*?<\/script>/g;
const STYLESHEET = /<link rel="stylesheet"[^>]*>/g;
const DECOR_BG = /<div class="fixed inset-0 pointer-events-none z-0">(?:<div[^>]*><\/div>)*<\/div>/;
const NO_BACKDROP = '<style>*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}</style>';

function must(html, pattern, name) {
  if (!pattern.test(html)) throw new Error(`诊断页：首页里找不到「${name}」，结构可能变了`);
  pattern.lastIndex = 0;
}

const home = await readFile(path.join(DIST_DIR, 'index.html'), 'utf-8');
must(home, LOADER, '主包加载脚本');
must(home, DECOR_BG, '背景模糊层');
must(home, STYLESHEET, '样式表');

const base = home.replace(LOADER, '').replace('<head>', `<head>${HEAD_PROBE}${NOINDEX}`);
const withOverlay = (html, label) => html.replace('</body>', `${overlay(label)}</body>`);

const minimal = `<!doctype html><html lang="zh-CN"><head>${HEAD_PROBE}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${NOINDEX}<title>diag m</title></head>
<body style="margin:0;padding:24px 16px;font:16px/1.7 -apple-system,system-ui,sans-serif;color:#222">
<h1>最小页面</h1>
${'<p>这一页没有任何外部资源：不引用 CSS、JS 与图片，只有几段文字。如果它打开时也要白屏好几秒，问题就与页面内容无关，而在网址本身或浏览器这一层。</p>'.repeat(4)}
</body></html>`;

const variants = [
  ['a', '对照：原首页（仅去掉主 JS）', withOverlay(base, 'A 对照：原首页')],
  ['b', '去掉背景模糊大圆', withOverlay(base.replace(DECOR_BG, ''), 'B 去掉背景模糊大圆')],
  ['c', '去掉毛玻璃（backdrop-filter）', withOverlay(base.replace('</head>', `${NO_BACKDROP}</head>`), 'C 去掉毛玻璃')],
  ['d', '同时去掉 B 和 C', withOverlay(base.replace(DECOR_BG, '').replace('</head>', `${NO_BACKDROP}</head>`), 'D 去掉模糊大圆和毛玻璃')],
  ['e', '去掉全部内联脚本', withOverlay(base.replace(INLINE_SCRIPT, '').replace('<head>', `<head>${HEAD_PROBE}`), 'E 去掉内联脚本')],
  ['f', '去掉 CSS（无样式）', withOverlay(base.replace(STYLESHEET, ''), 'F 去掉 CSS')],
  ['m', '最小页面（无任何外部资源）', withOverlay(minimal, 'M 最小页面')],
];

const index = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${NOINDEX}<title>诊断页</title></head>
<body style="margin:0;padding:24px 16px;font:17px/1.8 -apple-system,system-ui,sans-serif">
<h1 style="font-size:22px">首屏白屏诊断</h1>
<p>请逐个<b>长按链接 →「在新标签页中打开」</b>，记下内容是立刻出现还是白屏几秒后才出现；8 秒后页面底部会出现一个绿色方框，截图即可。</p>
<ol>${variants.map(([k, desc]) => `<li><a href="/diag/${k}/">${k.toUpperCase()}：${desc}</a></li>`).join('')}</ol>
</body></html>`;

await mkdir(path.join(DIST_DIR, 'diag'), { recursive: true });
await writeFile(path.join(DIST_DIR, 'diag', 'index.html'), index, 'utf-8');
for (const [k, , html] of variants) {
  await mkdir(path.join(DIST_DIR, 'diag', k), { recursive: true });
  await writeFile(path.join(DIST_DIR, 'diag', k, 'index.html'), html, 'utf-8');
}
console.log(`已生成 ${variants.length} 个诊断页（临时）：/diag/`);
