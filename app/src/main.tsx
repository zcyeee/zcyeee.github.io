import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
    hydrateRoot(rootElement, app)
  } else {
    createRoot(rootElement).render(app)
  }
}
