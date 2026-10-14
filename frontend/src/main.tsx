import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { getToken } from '@/zy/lib/kairosApi'
import { enPro } from '@/zy/lib/espace'
// Capte l'invite d'installation (beforeinstallprompt) dès le chargement : elle n'est envoyée qu'une fois.
import '@/zy/lib/installPwa'

// Thème choisi (clair / sombre) appliqué AVANT le premier affichage, sur toutes les pages.
try { if (localStorage.getItem('kairos_theme') === 'clair') document.body.classList.add('theme-clair') } catch { /* stockage indisponible */ }

// Ajoute le jeton de connexion à TOUS les appels vers /api faits avec fetch() (push, intégrations, paiement…).
// Sans lui, ces appels partaient sans compte et étaient refusés (401) : l'abonnement aux notifications échouait.
;(() => {
  if (typeof window === 'undefined' || !window.fetch) return
  const origFetch = window.fetch.bind(window)
  const estApi = (url: string) => {
    try {
      const u = new URL(url, window.location.origin)
      return u.origin === window.location.origin && u.pathname.startsWith('/api')
    } catch { return false }
  }
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : null
    const token = getToken()
    if (url && token && estApi(url)) {
      const headers = new Headers(init.headers || {})
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
      if (!headers.has('x-zayado-espace') && enPro()) headers.set('x-zayado-espace', 'pro')
      return origFetch(input, { ...init, headers })
    }
    return origFetch(input, init)
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Service worker : application installable (PWA), notifications push et partage depuis le téléphone.
// Il n'était plus enregistré depuis le passage à Vite : aucune notification push ne pouvait arriver.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker non enregistré :', e))
  })
}
