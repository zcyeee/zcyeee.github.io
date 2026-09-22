import { useEffect } from 'react';
import { siteConfig } from '@/data/siteConfig';

export interface SeoOptions {
  /** 页面标题，直接作为 document.title；省略时退回站点名 */
  title?: string;
  description?: string;
  /** 页面路径（以 / 开头），用于 canonical 与 og:url */
  path?: string;
  type?: 'website' | 'article';
  /** 文章发布日期，仅 type 为 article 时有意义 */
  publishedTime?: string;
  tags?: string[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * 逐页写入 title / description / Open Graph / canonical。
 *
 * 之所以用副作用直接操作 document.head 而不是引入 react-helmet：
 * react-snap 是在真实浏览器里等页面静默后拍快照的，effect 早已执行完毕，
 * 这些标签会原样进入每一页的静态 HTML，无需额外依赖。
 */
export function useSeo({ title, description, path, type = 'website', publishedTime, tags }: SeoOptions) {
  const tagList = tags?.join(',');

  useEffect(() => {
    // 不接站点名后缀：标签页收窄后只剩十几个字符，留给栏目名和文章标题
    const fullTitle = title ?? siteConfig.siteName;
    const desc = description || siteConfig.description;
    const url = `${siteConfig.siteUrl}${path ?? window.location.pathname}`;
    const image = `${siteConfig.siteUrl}${siteConfig.ogImage}`;

    document.title = fullTitle;

    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'author', siteConfig.author);

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:site_name', siteConfig.siteName);
    upsertMeta('property', 'og:locale', siteConfig.locale);
    upsertMeta('property', 'og:image', image);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', image);

    upsertCanonical(url);

    // 文章专有字段：换到非文章页面时必须清掉，否则会残留到下一页
    if (type === 'article' && publishedTime) {
      upsertMeta('property', 'article:published_time', publishedTime);
    } else {
      removeMeta('property', 'article:published_time');
    }

    document.head.querySelectorAll('meta[property="article:tag"]').forEach((el) => el.remove());
    if (type === 'article' && tagList) {
      for (const tag of tagList.split(',')) {
        const el = document.createElement('meta');
        el.setAttribute('property', 'article:tag');
        el.setAttribute('content', tag);
        document.head.appendChild(el);
      }
    }
  }, [title, description, path, type, publishedTime, tagList]);
}
