import type { BindingParams } from '@tweakpane/core'
import type { Random } from './random'

/**
 * A control in the panel. `value` is the default; every other key goes to
 * Tweakpane's `addBinding` (min, max, step, options, label, view, ...), and
 * the value's type picks the control: number → slider, boolean → checkbox,
 * '#rrggbb' → color picker, { x, y } → 2D pad, `options` → dropdown.
 * Don't name a param `seed`; that's taken.
 */
export type Param = BindingParams & {
  value: number | boolean | string | { x: number; y: number; z?: number; w?: number }
}
export type Params = Record<string, Param>
export type Values<P extends Params> = { [K in keyof P]: Widen<P[K]['value']> }
// `value: true` infers the literal `true`; params should read as plain `boolean`.
type Widen<T> = T extends boolean ? boolean : T

interface SketchOptions<P extends Params> {
  params?: P
  /** Seed to show when the URL doesn't name one. Omit for a random seed per visit. */
  seed?: number
  /** Width / height. Omit to fill whatever space the page gives the sketch. */
  aspect?: number
  /** Keep drawing every frame instead of only after something changes. */
  animate?: boolean
}

export interface DrawProps<P extends Params> {
  /** Already scaled for the pixel ratio: draw in CSS pixels. */
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  params: Values<P>
  /** Freshly seeded on every call, so the same seed draws the same picture. */
  rng: Random
  seed: number
  /** Seconds since the sketch started; always 0 unless `animate` is set. */
  time: number
}

/**
 * The simple form: a 2D canvas, redrawn from scratch whenever a param, the
 * seed, or the size changes (or every frame with `animate`).
 */
export interface DrawSketch<P extends Params> extends SketchOptions<P> {
  draw(props: DrawProps<P>): void
  setup?: never
}

export interface SetupProps<P extends Params> {
  canvas: HTMLCanvasElement
  /** Live: always holds the current values. */
  params: Values<P>
  width: number
  height: number
  pixelRatio: number
}

export interface GenerateProps<P extends Params> {
  /** Freshly seeded on every call. */
  rng: Random
  seed: number
  params: Values<P>
  width: number
  height: number
}

export interface ResizeProps {
  width: number
  height: number
  pixelRatio: number
}

export interface RenderProps {
  time: number
  /** Seconds since the previous render. */
  dt: number
}

/** What `setup` returns. Every hook is optional. */
export interface SketchInstance<P extends Params> {
  /** Called first, then whenever a param or the seed changes, and on resize if there's no `resize`. */
  generate?(props: GenerateProps<P>): void
  /** Called when the canvas changes size. The canvas's pixel size is already set. */
  resize?(props: ResizeProps): void
  /** Called every frame with `animate`, otherwise after each generate or resize. */
  render?(props: RenderProps): void
  dispose?(): void
}

/**
 * The full form: you own the canvas (WebGL, three.js, a stateful 2D
 * simulation, ...). `setup` runs once; the hooks it returns run after.
 */
export interface SetupSketch<P extends Params> extends SketchOptions<P> {
  setup(props: SetupProps<P>): SketchInstance<P>
  draw?: never
}

export type Sketch<P extends Params = Params> = DrawSketch<P> | SetupSketch<P>

export function defineSketch<P extends Params = {}>(sketch: Sketch<P>): Sketch<P> {
  return sketch
}
