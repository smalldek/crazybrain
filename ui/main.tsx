// Point d'entrée de l'interface : React prend la main sur <div id="racine"> (comme le Program.cs
// d'une appli Blazor qui monte le composant racine).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Appli } from './appli';
import './styles.css';

const racine = document.getElementById('racine');
if (!racine) throw new Error('Balise #racine absente de index.html.');
createRoot(racine).render(
  <StrictMode>
    <Appli />
  </StrictMode>,
);
