# Procedural

A static Astro site showcasing the user's procedural generation experiments. Each project is a folder in `projects/`, named as its URL: `index.mdx` holds the frontmatter and write-up, and an optional `sketch.ts` the generator. The site in `src/` builds the gallery, the pages and each sketch's controls; keep it small so the work goes into the sketches.

Before creating or changing a project or sketch, read `README.md`: it documents the frontmatter, the two sketch forms (`draw` and `setup`) and the shared code in `src/lib/`. When you change how any of that works, update the README in the same change.

Commits go straight to `main`, and every push to `main` deploys the public site (`.github/workflows/deploy.yml`).

## Seeds

The same seed and params must always draw the same picture: shareable URLs and sketches' default seeds depend on it. Take every random number from the `rng` the sketch receives (`rng.fork()` for an independent stream), and pass `rng` to any library that draws random numbers, as `createNoise2D(rng)` does. `pnpm lint` rejects `Math.random` and es-toolkit's `Math.random`-based helpers, but it can't see inside other libraries: confirm a library accepts a random source before using it.

`src/lib/random.test.ts` pins the generator's output for a seed. If it fails, every saved link now draws something else: change the generator only when that is the intent, then update the pinned values.

## Code

- Use an established library over hand-rolled code (es-toolkit for utilities, tw-animate-css for animations), and add a dependency when the work in front of you needs it, not in anticipation.
- Style with Tailwind utilities in the markup. Tailwind 4 is configured in CSS: the theme colors are in `@theme` in `src/styles/global.css`, and there is no `tailwind.config.js`. Elements created at runtime (a sketch's canvas, a thumbnail's image) are styled from their parent with variants like `[&_img]:`.
- Link to site pages through `href()` from `src/site.ts`, so a base path keeps working.
- Astro 7 and Tailwind 4 may be newer than you know: check https://docs.astro.build and the installed packages' types before relying on a remembered API.

## Checking work

Work is done when `pnpm lint`, `pnpm test` and `pnpm build` (which typechecks first) pass, after `pnpm format`. Sketches are visual, so also look at the page: `pnpm astro dev --background` serves http://localhost:4321/procedural-generation/ (`astro dev status`, `logs` and `stop` manage it). Sketches draw in `requestAnimationFrame`, which a hidden browser tab pauses, so look in a visible or headless browser. The URL carries the seed and params, so `?seed=42` brings back the same picture.
