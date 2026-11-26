import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

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
