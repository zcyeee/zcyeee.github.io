/**
 * 临时诊断页：确认 iPhone 上首页白屏已经修好，确认后删除本文件及 package.json 里的调用。
 *
 * 以预渲染好的首页为底，去掉主包（不进 React，避免 /diag/* 路由被渲染成 404），
 * 打开 8 秒后于页面底部显示浏览器记录的各项时间。rAF 是前 5 帧的开始时间：
 * 相邻两帧相差十几毫秒说明渲染正常，相差数秒就是首帧卡住了。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(HERE, '../dist');

const NOINDEX = '<meta name="robots" content="noindex">';
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

const ENTRY_SCRIPT = /<script type="module"[^>]*><\/script>/;

const home = await readFile(path.join(DIST_DIR, 'index.html'), 'utf-8');
if (!ENTRY_SCRIPT.test(home)) throw new Error('诊断页：首页里找不到主包的 <script type="module">，结构可能变了');

const fixedHome = home.replace(ENTRY_SCRIPT, '').replace('<head>', `<head>${HEAD_PROBE}${NOINDEX}`).replace('</body>', `${overlay('A 修复后的首页')}</body>`);

const minimal = `<!doctype html><html lang="zh-CN"><head>${HEAD_PROBE}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${NOINDEX}<title>diag m</title></head>
<body style="margin:0;padding:24px 16px;font:16px/1.7 -apple-system,system-ui,sans-serif;color:#222">
<h1>最小页面</h1>
${'<p>这一页没有任何外部资源：不引用 CSS、JS 与图片，只有几段文字，用作对照。</p>'.repeat(4)}
${overlay('M 最小页面')}
</body></html>`;

const variants = [
  ['a', '修复后的首页', fixedHome],
  ['m', '最小页面（对照）', minimal],
];

const index = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${NOINDEX}<title>诊断页</title></head>
<body style="margin:0;padding:24px 16px;font:17px/1.8 -apple-system,system-ui,sans-serif">
<h1 style="font-size:22px">首屏白屏验收</h1>
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
