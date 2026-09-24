import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { capturePrerenderedArticle } from '@/lib/prerendered-article'
import { isReactSnapPrerender } from '@/lib/prerender'

if (!Object.hasOwn) {
  Object.hasOwn = (obj: object, prop: PropertyKey) => Object.prototype.hasOwnProperty.call(obj, prop)
}

/**
 * 快照在 <html> 上记下自己是按哪条路径拍的。GitHub Pages 对不存在的地址一律返回 404.html，
 * 也就是 NotFound 的快照；拿它去 hydrate 别的路由（比如一篇不存在的文章）必然对不上，
 * React 会报错后丢掉整棵树重画。这种情况直接客户端渲染：快照照常留在屏幕上，
 * 直到 React 首次提交时才被替换，不会闪白。
 */
const PRERENDER_ROUTE_ATTR = 'data-prerender-route'
const trimTrailingSlash = (path: string) => path.replace(/\/+$/, '') || '/'

const rootElement = document.getElementById('root')

if (rootElement) {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  )

  // 必须先读后写：react-snap 生成 404 页时加载的是已经拍好的首页快照
  const snapshotRoute = document.documentElement.getAttribute(PRERENDER_ROUTE_ATTR)
  if (isReactSnapPrerender()) {
    document.documentElement.setAttribute(PRERENDER_ROUTE_ATTR, window.location.pathname)
  }
  const snapshotMatchesRoute =
    snapshotRoute === null || trimTrailingSlash(snapshotRoute) === trimTrailingSlash(window.location.pathname)

  if (rootElement.hasChildNodes() && snapshotMatchesRoute) {
    // 必须先于 hydrateRoot：此刻 DOM 仍是预渲染产物，正文可以原样取走复用
    capturePrerenderedArticle()
    hydrateRoot(rootElement, app)
  } else {
    createRoot(rootElement).render(app)
  }
}
