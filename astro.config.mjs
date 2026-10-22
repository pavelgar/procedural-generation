// @ts-check
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // GitHub Pages serves the site from a subpath; links go through href() in src/site.ts.
  site: 'https://pavelgar.github.io',
  base: '/procedural-generation',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
    // Each sketch is its own lazily loaded chunk, and three.js alone is ~550 kB.
    build: { chunkSizeWarningLimit: 1500 },
  },
})
