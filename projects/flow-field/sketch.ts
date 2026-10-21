import { createNoise2D } from '@/lib/noise'
import { defineSketch } from '@/lib/sketch'

// The first color is the background; the rest are inks.
const palettes: Record<string, string[]> = {
  dusk: ['#1b1b2f', '#e43f5a', '#f7b267', '#5c7aea', '#efe9e7'],
  ember: ['#140d0c', '#f25c54', '#f4a259', '#f7d08a', '#8c2f39'],
  sea: ['#0b1d26', '#3ec1d3', '#a8e6cf', '#f6f7d7', '#1f6f8b'],
  paper: ['#f3efe6', '#1d1d1d', '#3a3a3a', '#7a7a7a', '#b23a48'],
}

export default defineSketch({
  aspect: 1,
  params: {
    lines: { value: 1500, min: 100, max: 6000, step: 100 },
    steps: { value: 120, min: 10, max: 400, step: 10 },
    scale: { value: 2.5, min: 0.2, max: 10, label: 'noise scale' },
    turbulence: { value: 1.5, min: 0.1, max: 4 },
    stepLength: { value: 3, min: 0.5, max: 10, label: 'step length' },
    lineWidth: { value: 1.2, min: 0.25, max: 6, label: 'line width' },
    opacity: { value: 0.6, min: 0.05, max: 1 },
    palette: {
      value: 'dusk',
      options: Object.fromEntries(Object.keys(palettes).map((name) => [name, name])),
    },
  },

  draw({ ctx, width, height, params, rng }) {
    const [background, ...inks] = palettes[params.palette]
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    const noise = createNoise2D(rng)
    // Measure in thousandths of the short side, so the picture is the same at any size.
    const size = Math.min(width, height)
    const unit = size / 1000
    ctx.lineWidth = params.lineWidth * unit
    ctx.lineCap = 'round'
    ctx.globalAlpha = params.opacity

    for (let i = 0; i < params.lines; i++) {
      let x = rng.range(-0.1, 1.1) * width
      let y = rng.range(-0.1, 1.1) * height
      ctx.strokeStyle = rng.pick(inks)
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let step = 0; step < params.steps; step++) {
        const angle =
          noise((x / size) * params.scale, (y / size) * params.scale) * Math.PI * params.turbulence
        x += Math.cos(angle) * params.stepLength * unit
        y += Math.sin(angle) * params.stepLength * unit
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  },
})
