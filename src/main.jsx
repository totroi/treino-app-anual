import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

if (typeof window !== 'undefined') {
  window.__irontrackerInstallPrompt = window.__irontrackerInstallPrompt || null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__irontrackerInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('irontracker:install-prompt-ready'));
  });
  window.addEventListener('appinstalled', () => {
    window.__irontrackerInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('irontracker:app-installed'));
  });
}

if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        window.__irontrackerSwRegistration = registration;
        window.dispatchEvent(new CustomEvent('irontracker:sw-registered', { detail: registration }));
      })
      .catch(() => {
        // Falha silenciosa caso o navegador/contexto restrinja Service Workers
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
