export interface FbmOptions {
  octaves?: number
  /** Amplitude multiplier per octave. */
  persistence?: number
  /** Frequency multiplier per octave. */
  lacunarity?: number
}

/** Fractal Brownian motion over a 2D noise function. Returns roughly [-1, 1]. */
export function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  { octaves = 5, persistence = 0.5, lacunarity = 2 }: FbmOptions = {},
): number {
  let sum = 0
  let norm = 0
  let amplitude = 1
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency)
    norm += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  return sum / norm
}
