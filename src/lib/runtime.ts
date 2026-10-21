import { Pane } from 'tweakpane'
import { createRandom, randomSeed } from './random'
import type { DrawSketch, Params, Sketch, SketchInstance, Values } from './sketch'

type AnyValues = Values<Params>

const MAX_PIXEL_RATIO = 2

export function defaultValues(sketch: Sketch): AnyValues {
  return Object.fromEntries(Object.entries(sketch.params ?? {}).map(([key, p]) => [key, p.value]))
}

export interface RunnerOptions {
  /** Overrides for the sketch's default param values. */
  values?: Partial<AnyValues>
  seed?: number
  /** How a fixed-aspect canvas fits its host. */
  fit?: 'contain' | 'cover'
}

/** Mounts a sketch into `host` and drives it: sizing, seeding, regenerating, the frame loop. */
export class SketchRunner {
  readonly canvas = document.createElement('canvas')
  readonly defaults: AnyValues
  readonly values: AnyValues
  seed: number
  width = 0
  height = 0
  pixelRatio = 1

  private instance: SketchInstance<Params>
  private fit: 'contain' | 'cover'
  private dirty = { resize: false, generate: true, render: true }
  private frame = 0
  private visible = true
  private startTime = performance.now()
  private lastTime = 0
  private observers: { disconnect(): void }[] = []

  constructor(
    readonly sketch: Sketch,
    readonly host: HTMLElement,
    options: RunnerOptions = {},
  ) {
    this.defaults = defaultValues(sketch)
    // Cloned so controls bound to object values ({ x, y }) can't mutate the defaults.
    this.values = structuredClone({ ...this.defaults, ...options.values }) as AnyValues
    this.seed = options.seed ?? sketch.seed ?? randomSeed()
    this.fit = options.fit ?? 'contain'

    host.append(this.canvas)
    this.measure()
    this.dirty.resize = false
    this.instance = sketch.setup
      ? sketch.setup({
          canvas: this.canvas,
          params: this.values,
          width: this.width,
          height: this.height,
          pixelRatio: this.pixelRatio,
        })
      : drawInstance(sketch, this)

    // Render inside the observer callback, before paint, so resizing doesn't flash a blank canvas.
    const resizeObserver = new ResizeObserver(() => this.measure() && this.flush())
    resizeObserver.observe(host)
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting
      if (this.visible) this.schedule()
    })
    visibilityObserver.observe(host)
    this.observers.push(resizeObserver, visibilityObserver)

    this.schedule()
  }

  /** Re-runs generation, e.g. after a param changed. Coalesced to once per frame. */
  regenerate() {
    this.dirty.generate = true
    this.schedule()
  }

  reseed(seed = randomSeed()) {
    this.seed = seed
    this.regenerate()
  }

  resetParams() {
    Object.assign(this.values, structuredClone(this.defaults))
    this.regenerate()
  }

  /** Renders a fresh frame and returns it as a PNG data URL. */
  snapshot(): string {
    // Same task as the render: a WebGL canvas's buffer may be cleared once it's been shown.
    this.dirty.render = true
    this.flush()
    return this.canvas.toDataURL('image/png')
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    for (const observer of this.observers) observer.disconnect()
    this.instance.dispose?.()
    this.canvas.remove()
  }

  /** Applies whatever changed since the last frame, then renders if needed. */
  private flush(now = performance.now()) {
    const { dirty, instance, width, height, pixelRatio, sketch } = this
    const resized = dirty.resize
    if (dirty.resize) {
      dirty.resize = false
      if (instance.resize) instance.resize({ width, height, pixelRatio })
      else dirty.generate = true
    }
    if (dirty.generate) {
      dirty.generate = false
      dirty.render = true
      const { seed, values: params } = this
      instance.generate?.({ rng: createRandom(seed), seed, params, width, height })
    }
    if (dirty.render || resized || sketch.animate) {
      dirty.render = false
      const time = sketch.animate ? (now - this.startTime) / 1000 : 0
      instance.render?.({ time, dt: Math.min(Math.max(time - this.lastTime, 0), 0.1) })
      this.lastTime = time
    }
  }

  private schedule() {
    if (this.frame) return
    this.frame = requestAnimationFrame((now) => {
      this.frame = 0
      this.flush(now)
      if (this.sketch.animate && this.visible) this.schedule()
    })
  }

  /** Sizes the canvas to the host. Returns whether anything changed. */
  private measure(): boolean {
    let width = this.host.clientWidth
    let height = this.host.clientHeight
    const { aspect } = this.sketch
    if (aspect) {
      if (width / height > aspect === (this.fit === 'contain')) width = height * aspect
      else height = width / aspect
    }
    width = Math.max(1, Math.round(width))
    height = Math.max(1, Math.round(height))
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) {
      return false
    }

    Object.assign(this, { width, height, pixelRatio })
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.canvas.width = Math.round(width * pixelRatio)
    this.canvas.height = Math.round(height * pixelRatio)
    this.dirty.resize = true
    return true
  }
}

/** Adapts the `draw` form to the hooks the runner drives. */
function drawInstance(sketch: DrawSketch<Params>, runner: SketchRunner): SketchInstance<Params> {
  const ctx = runner.canvas.getContext('2d')!
  return {
    render({ time }) {
      const { width, height, pixelRatio, seed, values: params } = runner
      ctx.save()
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      sketch.draw({ ctx, width, height, params, rng: createRandom(seed), seed, time })
      ctx.restore()
    },
  }
}

export interface ControlsOptions {
  /** Mirror the seed and params into the page URL. */
  syncUrl?: boolean
  /** Base name for saved PNGs. */
  name: string
}

/** Builds the control panel for a runner. Returns a cleanup function. */
export function attachControls(
  runner: SketchRunner,
  container: HTMLElement,
  { syncUrl = false, name }: ControlsOptions,
): () => void {
  const pane = new Pane({ container })
  const writeUrlSoon = debounce(() => writeUrl(runner), 250)
  const update = () => {
    runner.regenerate()
    if (syncUrl) writeUrlSoon()
  }
  const reseed = () => {
    runner.reseed()
    pane.refresh()
    update()
  }

  pane.addBinding(runner, 'seed', { step: 1, min: 0 })
  pane.addButton({ title: 'New seed (R)' }).on('click', reseed)

  const params = Object.entries(runner.sketch.params ?? {})
  if (params.length) pane.addBlade({ view: 'separator' })
  for (const [key, { value: _, ...options }] of params) {
    pane.addBinding(runner.values, key, options)
  }

  pane.addBlade({ view: 'separator' })
  if (params.length) {
    pane.addButton({ title: 'Reset params' }).on('click', () => {
      runner.resetParams()
      pane.refresh()
      update()
    })
  }
  pane.addButton({ title: 'Save PNG' }).on('click', () => {
    download(runner.snapshot(), `${name}-${runner.seed}.png`)
  })
  pane.on('change', update)

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'r' || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.target instanceof Element && event.target.closest('input, textarea, select')) return
    reseed()
  }
  window.addEventListener('keydown', onKey)
  if (syncUrl) writeUrl(runner)

  return () => {
    window.removeEventListener('keydown', onKey)
    pane.dispose()
  }
}

/** The seed and param values named in the page URL. */
export function readUrl(defaults: AnyValues): { seed?: number; values: Partial<AnyValues> } {
  const query = new URLSearchParams(location.search)
  const values: Partial<AnyValues> = {}
  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = query.get(key)
    const value = raw === null ? undefined : parse(raw, fallback)
    if (value !== undefined) values[key] = value as AnyValues[string]
  }
  const seed = Number(query.get('seed') ?? NaN)
  return { seed: Number.isInteger(seed) ? seed : undefined, values }
}

/** Only values that differ from the defaults go in the URL, to keep links short. */
function writeUrl(runner: SketchRunner) {
  const query = new URLSearchParams({ seed: String(runner.seed) })
  for (const [key, value] of Object.entries(runner.values)) {
    const serialized = serialize(value)
    if (serialized !== serialize(runner.defaults[key])) query.set(key, serialized)
  }
  history.replaceState(history.state, '', `${location.pathname}?${query}${location.hash}`)
}

function serialize(value: unknown): string {
  if (typeof value === 'number') return String(Number(value.toPrecision(8)))
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function parse(raw: string, fallback: unknown): unknown {
  switch (typeof fallback) {
    case 'number': {
      const value = Number(raw)
      return Number.isFinite(value) ? value : undefined
    }
    case 'boolean':
      return raw === 'true'
    case 'string':
      return raw
    default:
      try {
        return JSON.parse(raw)
      } catch {
        return undefined
      }
  }
}

function download(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}
