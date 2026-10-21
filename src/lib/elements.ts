// Custom elements behind Sketch.astro and SketchThumbnail.astro. Each sketch
// module is its own chunk, loaded only on pages that show it.
import { SketchRunner, attachControls, defaultValues, readUrl } from './runtime'
import type { Sketch } from './sketch'

const modules = import.meta.glob<{ default: Sketch }>('/projects/*/sketch.ts')

async function loadSketch(project: string): Promise<Sketch> {
  const load = modules[`/projects/${project}/sketch.ts`]
  if (!load) throw new Error(`No sketch at projects/${project}/sketch.ts`)
  return (await load()).default
}

/** A live sketch, with a control panel if the markup has a [data-panel]. */
class SketchView extends HTMLElement {
  private cleanup?: () => void

  async connectedCallback() {
    const { project = '', params, seed, syncUrl } = this.dataset
    const stage = this.querySelector<HTMLElement>('[data-stage]')!
    const panel = this.querySelector<HTMLElement>('[data-panel]')
    try {
      const sketch = await loadSketch(project)
      if (!this.isConnected) return
      const url = syncUrl === undefined ? undefined : readUrl(defaultValues(sketch))
      const runner = new SketchRunner(sketch, stage, {
        values: { ...(params && JSON.parse(params)), ...url?.values },
        seed: url?.seed ?? (seed ? Number(seed) : undefined),
      })
      const detach = panel && attachControls(runner, panel, { syncUrl: !!url, name: project })
      this.cleanup = () => {
        detach?.()
        runner.dispose()
      }
    } catch (error) {
      stage.dataset.error = ''
      stage.textContent = String(error)
      throw error
    }
  }

  disconnectedCallback() {
    this.cleanup?.()
    this.cleanup = undefined
  }
}

// Thumbnails render one at a time: each holds a canvas (maybe a WebGL context) until disposed.
let queue = Promise.resolve()

/** Renders one frame of a sketch when scrolled near, then keeps it as an image. */
class SketchThumbnail extends HTMLElement {
  private observer?: IntersectionObserver

  connectedCallback() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        this.observer?.disconnect()
        queue = queue.then(() => this.capture()).catch(console.error)
      },
      { rootMargin: '200px' },
    )
    this.observer.observe(this)
  }

  disconnectedCallback() {
    this.observer?.disconnect()
  }

  private async capture() {
    const sketch = await loadSketch(this.dataset.project ?? '')
    if (!this.isConnected) return
    const runner = new SketchRunner(sketch, this, { fit: 'cover' })
    const image = new Image()
    image.alt = ''
    image.src = runner.snapshot()
    runner.dispose()
    this.append(image)
  }
}

if (!customElements.get('sketch-view')) customElements.define('sketch-view', SketchView)
if (!customElements.get('sketch-thumbnail'))
  customElements.define('sketch-thumbnail', SketchThumbnail)
