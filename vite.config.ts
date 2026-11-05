// Vite construit l'interface (ui/) en fichiers statiques dans dist/, que le Worker sert tels quels.
// C'est l'étape « build » d'un projet front : il traduit le TypeScript et le JSX de React en
// JavaScript pour le navigateur, et regroupe le tout en quelques fichiers.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'ui',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
});
