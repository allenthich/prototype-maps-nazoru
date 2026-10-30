import node from '@astrojs/node';
import { defineConfig, envField, memoryCache } from 'astro/config';

const listingCache = { maxAge: 300, swr: 60, tags: ['listings'] };

export default defineConfig({
  site: 'http://localhost:4321',
  output: 'server',
  trailingSlash: 'always',
  adapter: node({ mode: 'standalone' }),
  cache: { provider: memoryCache() },
  routeRules: {
    '/nagoya': listingCache,
    '/nagoya/ward/[ward]': listingCache,
    '/nagoya/station/[station]': listingCache,
    '/listings/[id]': listingCache,
  },
  env: {
    schema: {
      // Empty key = Google's keyless development mode (watermarked tiles).
      GOOGLE_MAPS_API_KEY: envField.string({ context: 'server', access: 'public', optional: true, default: '' }),
      GOOGLE_MAPS_MAP_ID: envField.string({ context: 'server', access: 'public', optional: true, default: 'DEMO_MAP_ID' }),
    },
  },
});
