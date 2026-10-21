// @ts-check
import mdx from '@astrojs/mdx'
import { defineConfig } from 'astro/config'

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  integrations: [mdx()],
  vite: {
    // Each sketch is its own lazily loaded chunk, and three.js alone is ~550 kB.
    build: { chunkSizeWarningLimit: 1500 },
  },
})
