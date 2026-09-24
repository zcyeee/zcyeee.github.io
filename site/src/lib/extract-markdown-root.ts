/**
 * 从一整页预渲染 HTML 的源码里，取出正文根节点（`data-markdown-root`）的 innerHTML。
 *
 * 用字符串扫描而不是 DOMParser：后者要把整页（最重的文章有 760 KB）完整解析成 DOM，
 * 在手机上是几百毫秒的长任务；而这里只需要找到正文的起止位置，React 随后用
 * dangerouslySetInnerHTML 解析一次即可。
 *
 * 能用简单扫描的前提是输入来自浏览器序列化（react-snap 快照）：文本里的 `<` 一定被转义成
 * `&lt;`，所以源码中出现的 `<` 只可能是真正的标签、注释，或 script/style 这类原文元素的内容。
 * 这三种情况分别处理，并在标签内部跳过引号里的属性值，其余只需数 div 的嵌套层数。
 *
 * 找不到根节点或结构不闭合时返回 null，调用方应退回 Markdown 渲染。
 *
 * 不要在这里引入任何依赖：scripts 与验证脚本会直接用 Node 加载这个文件。
 */

const ROOT_START = /<div\b[^>]*\bdata-markdown-root\b[^>]*>/i;
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

export function extractMarkdownRootHtml(html: string): string | null {
  const start = ROOT_START.exec(html);
  if (!start) return null;
  const begin = start.index + start[0].length;

  let depth = 0;
  let i = begin;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) return null;

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end === -1) return null;
      i = end + 3;
      continue;
    }

    if (html[lt + 1] === '/') {
      const gt = html.indexOf('>', lt);
      if (gt === -1) return null;
      const name = html.slice(lt + 2, gt).trim().toLowerCase();
      if (name === 'div') {
        if (depth === 0) return html.slice(begin, lt);
        depth -= 1;
      }
      i = gt + 1;
      continue;
    }

    const nameMatch = /^<([a-zA-Z][^\s/>]*)/.exec(html.slice(lt, lt + 64));
    if (!nameMatch) {
      i = lt + 1;
      continue;
    }
    const name = nameMatch[1].toLowerCase();

    // 找到开始标签的结尾，跳过引号里的属性值
    let j = lt + nameMatch[0].length;
    let quote: string | null = null;
    for (; j < html.length; j++) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
    }
    if (j >= html.length) return null;

    // HTML 解析器会忽略 div 上的自闭合斜杠，这里保持一致
    if (name === 'div') depth += 1;
    i = j + 1;

    if (RAW_TEXT_ELEMENTS.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'ig');
      close.lastIndex = i;
      const m = close.exec(html);
      if (!m) return null;
      i = m.index + m[0].length;
    }
  }
  return null;
}
