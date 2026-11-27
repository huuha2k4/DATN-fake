import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// An open tab can still reference chunks from the previous deployment.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'finora:chunk-reload-at'
  const now = Date.now()
  try {
    const lastReload = Number(sessionStorage.getItem(key))
    if (now - lastReload < 60_000) return
    sessionStorage.setItem(key, String(now))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
