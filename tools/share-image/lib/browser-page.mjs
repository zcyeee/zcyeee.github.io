/**
 * Every function here is serialized and executed inside the browser, so each
 * one must be self-contained: no imports, no references to module scope.
 */

/** Strips site chrome, freezes entrance animations, and reflows blocks that would be clipped. */
export function prepareForExport({ barHeight }) {
    const style = document.createElement('style');
    style.textContent = `
        *, *::before, *::after { animation: none !important; transition: none !important; }
        main div[style*="opacity"] { opacity: 1 !important; }
        main div[style*="translate"], main div[style*="matrix"] { transform: none !important; }
        main { padding-top: 10px !important; }
        .prose pre { white-space: pre-wrap !important; word-break: break-word !important; overflow-x: visible !important; padding: 12px 10px !important; }
        .prose pre code { white-space: pre-wrap !important; word-break: break-word !important; }
        .prose div[style*="overflow-x"] { overflow: visible !important; margin-left: -16px !important; margin-right: -16px !important; }
        .prose div[style*="overflow-x"] > svg { min-width: 0 !important; width: 100% !important; height: auto !important; }
        .prose .overflow-x-auto { overflow: visible !important; }
        .prose .katex-display { overflow: visible !important; }
        .prose table { table-layout: fixed; width: 100% !important; font-size: 12.5px !important; }
        .prose th, .prose td { padding: 6px 8px !important; word-break: break-word !important; }
        #__share_spacer { height: 400px; }
    `;
    document.head.appendChild(style);

    // A display formula wider than the export viewport would be clipped at the
    // edge. KaTeX sizes everything in em, so shrinking the font makes it fit
    // while keeping the measured block height correct.
    document.querySelectorAll('.prose .katex-display').forEach((display) => {
        const html = display.querySelector('.katex-html');
        const contentWidth = html ? html.getBoundingClientRect().width : display.scrollWidth;
        const available = display.clientWidth;
        if (!available || contentWidth <= available) return;
        const fontSize = parseFloat(getComputedStyle(display).fontSize);
        display.style.fontSize = `${fontSize * (available / contentWidth) * 0.98}px`;
    });

    const hide = (el) => { if (el) el.style.display = 'none'; };
    hide(document.querySelector('header.fixed'));
    hide(document.querySelector('body > div > footer'));

    const title = document.querySelector('main h1');
    hide(title.nextElementSibling); // publish date and reading time
    title.style.marginBottom = '0'; // that margin only existed to separate the two

    // Pull the article card up towards the title, which now ends the header.
    const header = title.closest('section');
    header.style.paddingBottom = '0';
    if (header.nextElementSibling) header.nextElementSibling.style.paddingTop = '12px';

    const buttons = [...document.querySelectorAll('main button')];
    const backButton = buttons.find((b) => b.textContent.includes('返回'));
    hide(backButton?.closest('a')?.parentElement);
    const shareButton = buttons.find((b) => b.textContent.includes('分享'));
    hide(shareButton?.closest('.mt-8')?.parentElement ?? shareButton?.closest('.mt-8'));
    const related = [...document.querySelectorAll('main h2')].find((h) => h.textContent.includes('相关文章'));
    hide(related?.closest('.mt-10')?.parentElement ?? related?.closest('.mt-10'));

    // Opaque bar pinned to the viewport bottom: carries the page number and
    // covers the sliver of the next page that the viewport would otherwise show.
    const bar = document.createElement('div');
    bar.id = '__share_bar';
    bar.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${barHeight}px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 20px;z-index:9999;background:hsl(var(--background));border-top:1px solid hsl(var(--border)/0.6);font-size:12px;color:hsl(var(--muted-foreground));`;
    const left = document.createElement('span');
    left.id = '__share_bar_left';
    left.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const right = document.createElement('span');
    right.id = '__share_bar_right';
    right.style.cssText = 'flex-shrink:0;font-variant-numeric:tabular-nums;letter-spacing:0.02em;';
    bar.append(left, right);
    document.body.appendChild(bar);

    // Lets the last pages scroll all the way to their start offset.
    const spacer = document.createElement('div');
    spacer.id = '__share_spacer';
    document.body.appendChild(spacer);

    return title.textContent.trim();
}

/** Reports the document-space position and role of every top-level article block. */
export function measureBlocks() {
    const prose = document.querySelector('.prose');
    const offsets = (el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY };
    };

    const blocks = [...prose.children].map((el, index) => {
        const { top, bottom } = offsets(el);
        const text = (el.textContent || '').trim();
        return {
            index,
            tag: el.tagName,
            top,
            bottom,
            isHeading: /^H[1-6]$/.test(el.tagName),
            isHr: el.tagName === 'HR',
            endsWithColon: /[：:]$/.test(text),
            preview: text.replace(/\s+/g, ' ').slice(0, 26),
        };
    });

    const card = prose.parentElement.parentElement;
    return { blocks, cardBottom: offsets(card).bottom };
}

/** Widens the gap at every seam so neither side of a cut looks cramped. */
export function applyCutGaps({ indices, gap }) {
    const children = [...document.querySelector('.prose').children];
    indices.forEach((i) => {
        const next = children[i + 1];
        if (next) next.style.marginTop = `${gap}px`;
    });
}

/** Scrolls to a page's start offset and labels its bar. Returns the offset actually reached. */
export function showPage({ y, label, index, count }) {
    document.getElementById('__share_bar_left').textContent = label;
    document.getElementById('__share_bar_right').textContent = `${index} / ${count}`;
    window.scrollTo(0, y);
    return Math.round(window.scrollY);
}
