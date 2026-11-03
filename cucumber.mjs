// Tests d'acceptation : Cucumber.js lit les scénarios Gherkin (features/*.feature, en français)
// et les joue contre le vrai Worker, lancé en local par wrangler avec une base D1 locale.
export default {
  paths: ['features/**/*.feature'],
  import: ['features/support/**/*.ts', 'features/etapes/**/*.ts'],
  format: ['progress-bar', 'summary'],
};
