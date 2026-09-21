#!/usr/bin/env node
/**
 * Renders a blog post into mobile-friendly share images, cutting only at
 * paragraph boundaries. See README.md for the full workflow.
 *
 *   node render.mjs <slug> [options]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer-core';
import { ensureSite } from './lib/dev-server.mjs';
import { prepareForExport, measureBlocks, applyCutGaps, showPage } from './lib/browser-page.mjs';
import { planPages } from './lib/split.mjs';

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(HERE, '../../site');
const POSTS_DIR = path.join(SITE_DIR, 'src/content/posts');

const DEFAULTS = {
    width: 480,          // CSS px; drives text size relative to the image
    scale: 3,            // device pixel ratio, so the PNG is width × scale wide
    height: 840,         // target height per image, CSS px
    balance: 70,         // how hard to push pages towards the target height
    theme: 'light',
    port: 5180,
    preview: true,
    barHeight: 46,       // footer bar with the title and page number
    cutGap: 48,          // extra breathing room added at every seam
    previewWidth: 1200,
};

const HELP = `
用法: node render.mjs <slug> [选项]

选项:
  --height <px>       每张图的目标高度（CSS px），默认 ${DEFAULTS.height}
  --max-height <px>   单张高度上限，默认为目标高度的 1.2 倍
  --width <px>        版面宽度（CSS px），越大字越小，默认 ${DEFAULTS.width}
  --scale <n>         像素密度，成图宽度 = width × scale，默认 ${DEFAULTS.scale}
  --balance <n>       各页高度均衡权重，越大越平均，默认 ${DEFAULTS.balance}
  --theme <light|dark> 主题，默认 ${DEFAULTS.theme}
  --out <dir>         输出目录，默认 out/<slug>
  --port <n>          自动启动 dev server 时使用的端口，默认 ${DEFAULTS.port}
  --origin <url>      直接使用已运行的站点地址，跳过自动启动
  --no-preview        不生成缩略图
  --list              列出所有可渲染的文章 slug
  -h, --help          显示本帮助

示例:
  node render.mjs cc-memory
  node render.mjs rl-foundations --height 700
  node render.mjs lora --width 560 --scale 2.5 --theme dark
`.trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
    const options = { ...DEFAULTS };
    const positional = [];
    const numeric = new Set(['height', 'maxHeight', 'width', 'scale', 'balance', 'port']);

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('-')) { positional.push(arg); continue; }
        if (arg === '-h' || arg === '--help') { options.help = true; continue; }
        if (arg === '--list') { options.list = true; continue; }
        if (arg === '--no-preview') { options.preview = false; continue; }

        const key = arg.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) throw new Error(`选项 ${arg} 缺少取值`);
        i += 1;
        options[key] = numeric.has(key) ? Number(value) : value;
    }

    options.slug = positional[0];
    options.maxHeight ??= Math.round(options.height * 1.2);
    return options;
}

async function listPosts() {
    const files = (await fs.readdir(POSTS_DIR)).filter((f) => f.endsWith('.md')).sort();
    return Promise.all(files.map(async (file) => {
        const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf8');
        const title = raw.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1] ?? '';
        return { slug: file.replace(/\.md$/, ''), title };
    }));
}

async function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ].filter(Boolean);

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch { /* try the next one */ }
    }
    throw new Error('找不到可用的 Chrome，可用 CHROME_PATH 环境变量指定路径');
}

async function renderPost(options) {
    const { slug, width, scale, theme, barHeight, cutGap } = options;
    const outDir = path.resolve(options.out ?? path.join(HERE, 'out', slug));
    await fs.mkdir(outDir, { recursive: true });

    const site = await ensureSite({ siteDir: SITE_DIR, port: options.port, origin: options.origin, log: console.log });
    const browser = await puppeteer.launch({
        executablePath: await findChrome(),
        headless: true,
        args: ['--no-sandbox', '--font-render-hinting=none', '--hide-scrollbars'],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width, height: options.maxHeight, deviceScaleFactor: scale });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
        await page.evaluateOnNewDocument((value) => {
            try { localStorage.setItem('site-theme', value); } catch { /* session-only is fine */ }
        }, theme);

        await page.goto(`${site.origin}/blog/${slug}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await page.waitForSelector('.prose h2', { timeout: 30000 });

        // Scroll once so every AnimatedSection has entered the viewport, then
        // let webfonts settle — both change the geometry we are about to measure.
        await page.evaluate(async () => {
            const step = window.innerHeight / 2;
            for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
                window.scrollTo(0, y);
                await new Promise((resolve) => setTimeout(resolve, 40));
            }
            window.scrollTo(0, 0);
        });
        await page.evaluate(() => document.fonts.ready);
        await sleep(400);

        const title = await page.evaluate(prepareForExport, { barHeight });
        await sleep(200);

        const initial = await page.evaluate(measureBlocks);
        const { target, cutIndices } = planPages(initial.blocks, {
            startY: 0,
            endY: initial.cardBottom + 20,
            pageHeight: options.height,
            maxHeight: options.maxHeight,
            balance: options.balance,
        });

        // Widening the seams moves everything below them, so re-measure before
        // turning the chosen block indices into pixel offsets.
        await page.evaluate(applyCutGaps, { indices: cutIndices, gap: cutGap });
        await sleep(200);
        const final = await page.evaluate(measureBlocks);
        const boundaries = [
            0,
            ...cutIndices.map((i) => (final.blocks[i].bottom + final.blocks[i + 1].top) / 2),
            final.cardBottom + 20,
        ];
        const count = boundaries.length - 1;
        console.log(`《${title}》正文 ${Math.round(initial.cardBottom)}px，目标 ${Math.round(target)}px/张，共 ${count} 张`);

        const pages = [];
        for (let index = 0; index < count; index += 1) {
            const startY = Math.round(boundaries[index]);
            const height = Math.round(boundaries[index + 1]) - startY;
            await page.setViewport({ width, height: height + barHeight, deviceScaleFactor: scale });
            const reached = await page.evaluate(showPage, { y: startY, label: title, index: index + 1, count });
            await sleep(180);
            if (Math.abs(reached - startY) > 1) console.warn(`  第 ${index + 1} 张滚动被截断：${reached} ≠ ${startY}`);

            const file = path.join(outDir, `${slug}-${String(index + 1).padStart(2, '0')}.png`);
            await page.screenshot({ path: file });
            const { size } = await fs.stat(file);
            pages.push({
                file,
                size,
                pixels: `${width * scale}×${(height + barHeight) * scale}`,
                head: final.blocks.find((block) => block.top >= startY - 2)?.preview ?? '',
            });
        }
        return { outDir, pages };
    } finally {
        await browser.close();
        await site.stop();
    }
}

async function writePreviews(pages, outDir, previewWidth) {
    const previewDir = path.join(outDir, 'preview');
    await fs.mkdir(previewDir, { recursive: true });
    await Promise.all(pages.map(({ file }) => execFileAsync('sips', [
        '-Z', String(previewWidth), file, '--out', path.join(previewDir, path.basename(file)),
    ])));
    return previewDir;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) { console.log(HELP); return; }
    if (options.list) {
        for (const { slug, title } of await listPosts()) console.log(`${slug.padEnd(32)}${title}`);
        return;
    }
    if (!options.slug) { console.log(HELP); process.exitCode = 1; return; }

    const posts = await listPosts();
    if (!posts.some((post) => post.slug === options.slug)) {
        throw new Error(`找不到文章 ${options.slug}，用 --list 查看全部 slug`);
    }

    const { outDir, pages } = await renderPost(options);
    for (const [index, { file, pixels, size, head }] of pages.entries()) {
        console.log(`  ${String(index + 1).padStart(2)}  ${pixels.padEnd(11)}  ${(size / 1024 / 1024).toFixed(2)}MB  ${head}`);
    }
    if (options.preview) {
        const previewDir = await writePreviews(pages, outDir, options.previewWidth);
        console.log(`缩略图: ${previewDir}`);
    }
    console.log(`完成: ${pages.length} 张 → ${outDir}`);
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
