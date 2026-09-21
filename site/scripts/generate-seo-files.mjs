/**
 * 构建后生成 sitemap.xml / robots.txt / rss.xml。
 *
 * 直接扫描 src/content/posts 的 frontmatter，而不是复用 posts-loader.ts——
 * 后者是给浏览器用的 TS 模块，依赖 import.meta.glob，在 Node 脚本里跑不起来。
 * 两边的 frontmatter 约定保持一致即可（title / date / excerpt 必填）。
 *
 * 在 react-snap 之后执行，所以只往 dist/ 追加文件，不会被预渲染流程覆盖。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(HERE, '..');
const POSTS_DIR = path.join(SITE_DIR, 'src/content/posts');
const DIST_DIR = path.join(SITE_DIR, 'dist');

// 与 src/data/siteConfig.ts 保持一致
const SITE_URL = 'https://zcyeee.github.io';
const SITE_NAME = '张晨阳的个人主页';
const SITE_DESC =
    '张晨阳的个人主页与技术博客，记录大语言模型、强化学习、位置编码与工程实践方面的学习笔记。';
const AUTHOR = '张晨阳';

const STATIC_ROUTES = [
    { path: '/', priority: '1.0' },
    { path: '/blog', priority: '0.9' },
    { path: '/archive', priority: '0.6' },
    { path: '/gallery', priority: '0.5' },
];

const escapeXml = (s) =>
    String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function parseFrontmatter(raw) {
    if (!raw.startsWith('---')) return {};
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return {};
    const data = {};
    for (const line of raw.slice(4, end).split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        const val = line.slice(colon + 1).trim();
        if (!key) continue;
        data[key] = val.replace(/^["']|["']$/g, '');
    }
    return data;
}

const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md'));
const posts = [];
for (const file of files) {
    const raw = await readFile(path.join(POSTS_DIR, file), 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm.title || !fm.date) {
        console.warn(`跳过 ${file}：frontmatter 缺少 title 或 date`);
        continue;
    }
    posts.push({ slug: file.replace(/\.md$/, ''), title: fm.title, date: fm.date, excerpt: fm.excerpt ?? '' });
}
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

const latest = posts[0]?.date ?? new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_ROUTES.map(
    (r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${latest}</lastmod>
    <priority>${r.priority}</priority>
  </url>`
).join('\n')}
${posts
    .map(
        (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.slug}</loc>
    <lastmod>${p.date}</lastmod>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${posts
    .map(
        (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <author>${escapeXml(AUTHOR)}</author>
      <description>${escapeXml(p.excerpt)}</description>
    </item>`
    )
    .join('\n')}
  </channel>
</rss>
`;

await writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
await writeFile(path.join(DIST_DIR, 'robots.txt'), robots);
await writeFile(path.join(DIST_DIR, 'rss.xml'), rss);

console.log(`已生成 sitemap.xml / robots.txt / rss.xml（${posts.length} 篇文章 + ${STATIC_ROUTES.length} 个静态页）`);
