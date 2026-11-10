// Point d'entrée de l'interface : React prend la main sur <div id="racine"> (comme le Program.cs
// d'une appli Blazor qui monte le composant racine).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Appli } from './appli';
import './styles.css';

const racine = document.getElementById('racine');
if (!racine) throw new Error('Balise #racine absente de index.html.');
// Le service worker rend l'appli installable sur le téléphone (tâche 5.1, ui/public/sw.js).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e: unknown) => console.warn('Service worker refusé :', e));
  });
}

createRoot(racine).render(
  <StrictMode>
    <Appli />
  </StrictMode>,
);
