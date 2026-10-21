/**
 * A seeded random number generator. Call it for a float in [0, 1), or use the
 * helpers. Pass it anywhere a `() => number` is expected (e.g. simplex-noise).
 */
export interface Random {
  (): number
  /** Float in [min, max). */
  range(min: number, max: number): number
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number
  /** True with probability `p`. */
  chance(p?: number): boolean
  pick<T>(items: readonly T[]): T
  /** Shuffles `items` in place and returns it. */
  shuffle<T>(items: T[]): T[]
  /** Normally distributed number. */
  gaussian(mean?: number, sd?: number): number
  /**
   * An independent generator seeded from this one, so a sub-system can draw
   * numbers without shifting the main sequence when it changes.
   */
  fork(): Random
}

export function createRandom(seed: number): Random {
  // mulberry32: tiny, fast, and plenty for visuals.
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const range = (min: number, max: number) => min + next() * (max - min)
  const int = (min: number, max: number) => Math.floor(range(min, max + 1))

  return Object.assign(next, {
    range,
    int,
    chance: (p = 0.5) => next() < p,
    pick: <T>(items: readonly T[]) => items[int(0, items.length - 1)],
    shuffle: <T>(items: T[]) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(0, i)
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      return items
    },
    gaussian: (mean = 0, sd = 1) =>
      mean + sd * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
    fork: () => createRandom(int(0, 2 ** 32 - 1)),
  })
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000)
}
