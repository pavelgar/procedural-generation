# Procedural

A static site for showcasing procedural generation experiments. Each project is
a folder with a sketch and a write-up; the site builds the gallery, the project
pages, and the controls around them.

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # typecheck + static build into dist/
pnpm test      # unit tests (src/**/*.test.ts, run by Node directly)
pnpm format
```

## Adding a project

Create a folder in `projects/`. Its name is the URL (`/my-project/`).

```
projects/my-project/
├── index.mdx    # frontmatter + write-up (required)
├── sketch.ts    # the generator (optional: a write-up-only project works too)
└── cover.png    # optional gallery image
```

`index.mdx`:

```mdx
---
title: My project
description: One line for the gallery card.
date: 2026-10-22
tags: [noise, 2d]
cover: ./cover.png # optional; without it the gallery renders the sketch live
draft: true # optional; drafts are listed in dev only
---

Write-up in Markdown. `<Sketch>` works without an import, to show the sketch
again with other params, e.g. one stage of an algorithm:

<Sketch project="my-project" seed={7} params={{ octaves: 1 }} />
```

The sketch at the top of the page gets the full control panel. Its seed and any
changed params live in the URL, so a link reproduces exactly what you see.
Saving a file reloads the page with the same seed and params. **R** picks a
new seed; **Save PNG** downloads the current frame (a good way to make a
`cover.png`).

## Writing a sketch

`params` become the controls. The value's type picks the control (number with
`min`/`max` → slider, boolean → checkbox, `'#rrggbb'` → color, `{ x, y }` → 2D
pad, `options` → dropdown); everything besides `value` is passed to
[Tweakpane's `addBinding`](https://tweakpane.github.io/docs/input-bindings/).
`params` and `rng` come back fully typed.

**Simple form**: a 2D canvas, redrawn from scratch whenever anything changes.
`rng` is freshly seeded on each call, so a seed always draws the same picture.
See `projects/flow-field/`.

```ts
import { defineSketch } from '@/lib/sketch'

export default defineSketch({
  aspect: 1, // optional; omit to fill the stage
  params: {
    count: { value: 500, min: 10, max: 5000, step: 10 },
  },
  draw({ ctx, width, height, params, rng }) {
    // ...
  },
})
```

Add `animate: true` to call `draw` every frame with `time`.

**Full form**: you own the canvas, for WebGL/three.js or a simulation that
keeps state between frames. `setup` runs once and returns hooks, all optional.
See `projects/terrain/`.

```ts
export default defineSketch({
  animate: true,
  params: { ... },
  setup({ canvas, params, width, height, pixelRatio }) {
    // create the renderer, scene, ...; `params` stays current
    return {
      generate({ rng, params }) {}, // first, then on every param or seed change
      resize({ width, height, pixelRatio }) {}, // without it, a resize re-runs generate
      render({ time, dt }) {}, // every frame with `animate`, otherwise after changes
      dispose() {},
    }
  },
})
```

## Shared code

- `src/lib/random.ts`: the seeded `rng` (`range`, `int`, `pick`, `shuffle`,
  `gaussian`, `fork`, ...). Pass it to libraries that take a `() => number`.
- `src/lib/noise.ts`: `fbm`, which layers any `(x, y) => number` noise.

Add anything reusable there and import it with `@/lib/...`. Each sketch is
its own chunk, so a project's dependencies only load on its page.

For general utilities (`clamp`, `range`, `mapValues`, `debounce`, ...) use
[es-toolkit](https://es-toolkit.dev) before writing your own. Its random
helpers (`shuffle`, `sample`, `random`, `randomInt`) use `Math.random`, so in a
sketch they ignore the seed: use `rng` for anything random.

## Layout

- `projects/`: your work.
- `src/lib/sketch.ts`: the sketch types.
- `src/lib/runtime.ts`: drives a sketch: sizing, seeding, frame loop, controls,
  URL sync.
- `src/pages/`: the gallery (`index.astro`) and project pages (`[slug].astro`).
- `src/site.ts`: site title and description.
- `src/styles/global.css`: Tailwind setup and the theme colors (`bg`, `surface`,
  `fg`, `muted`, `accent`). Write-ups are styled by the typography plugin
  (`prose`); enter/exit animations come from
  [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css)
  (`animate-in fade-in`, ...).

## Deploying

Not set up yet. `pnpm build` writes a fully static site to `dist/`, which
works on any static host. To serve it from a subpath (e.g. GitHub Pages at
`/<repo>/`), set `site` and `base` in `astro.config.mjs`. Links go through
`href()` from `src/site.ts`, so they already pick up the base.
