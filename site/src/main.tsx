import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { capturePrerenderedArticle } from '@/lib/prerendered-article'

if (!Object.hasOwn) {
  Object.hasOwn = (obj: object, prop: PropertyKey) => Object.prototype.hasOwnProperty.call(obj, prop)
}

const rootElement = document.getElementById('root')

if (rootElement) {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  )

  if (rootElement.hasChildNodes()) {
    // 必须先于 hydrateRoot：此刻 DOM 仍是预渲染产物，正文可以原样取走复用
    capturePrerenderedArticle()
    hydrateRoot(rootElement, app)
  } else {
    createRoot(rootElement).render(app)
  }
}
