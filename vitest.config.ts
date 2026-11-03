// Tests unitaires : Vitest (l'équivalent de xUnit). Ils tournent dans Node, sans Cloudflare.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unitaires/**/*.test.ts'],
  },
});
