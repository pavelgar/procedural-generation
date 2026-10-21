import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { mean, range } from 'es-toolkit'
import { createRandom } from './random.ts'

const draw = <T>(count: number, fn: () => T) => Array.from({ length: count }, fn)

describe('createRandom', () => {
  // Shared links and sketches' default seeds depend on these exact numbers.
  // If this fails, every saved seed now draws a different picture: change the
  // generator only on purpose, then update the values.
  test('draws the same sequence for a seed as it always has', () => {
    // These match the reference mulberry32 implementation.
    assert.deepEqual(
      draw(4, createRandom(42)),
      [0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693],
    )

    // The helpers map that same stream, so the mapping is pinned too.
    const rng = createRandom(42)
    assert.deepEqual(
      [rng.int(0, 100), rng.range(-1, 1), rng.gaussian(), rng.pick(['a', 'b', 'c', 'd'])],
      [60, -0.10341888200491667, -0.9453528099747296, 'a'],
    )
    assert.deepEqual(rng.shuffle([1, 2, 3, 4, 5]), [1, 5, 4, 2, 3])
  })

  test('repeats for the same seed and differs between seeds', () => {
    assert.deepEqual(draw(100, createRandom(7)), draw(100, createRandom(7)))
    assert.notDeepEqual(draw(100, createRandom(7)), draw(100, createRandom(8)))
  })

  test('draws floats in [0, 1)', () => {
    for (const value of draw(10_000, createRandom(1))) {
      assert.ok(value >= 0 && value < 1, `${value} out of range`)
    }
  })

  test('range stays in [min, max)', () => {
    const rng = createRandom(2)
    for (const value of draw(10_000, () => rng.range(-3, 5))) {
      assert.ok(value >= -3 && value < 5, `${value} out of range`)
    }
  })

  test('int hits both ends and nothing outside', () => {
    const rng = createRandom(3)
    const seen = new Set(draw(10_000, () => rng.int(1, 6)))
    assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5, 6])
  })

  test('chance matches its probability', () => {
    const rng = createRandom(4)
    const hits = draw(20_000, () => rng.chance(0.3)).filter(Boolean).length
    assert.ok(Math.abs(hits / 20_000 - 0.3) < 0.02, `hit rate ${hits / 20_000}`)
  })

  test('pick reaches every item', () => {
    const rng = createRandom(5)
    const items = ['a', 'b', 'c']
    assert.deepEqual(new Set(draw(1_000, () => rng.pick(items))), new Set(items))
  })

  test('shuffle permutes in place', () => {
    const items = range(50)
    const shuffled = createRandom(6).shuffle(items)
    assert.equal(shuffled, items)
    assert.deepEqual(
      [...shuffled].sort((a, b) => a - b),
      range(50),
    )
    assert.notDeepEqual(shuffled, range(50))
  })

  test('gaussian has the requested mean and spread', () => {
    const rng = createRandom(7)
    const values = draw(20_000, () => rng.gaussian(10, 2))
    const average = mean(values)
    const sd = Math.sqrt(mean(values.map((v) => (v - average) ** 2)))
    assert.ok(Math.abs(average - 10) < 0.05, `mean ${average}`)
    assert.ok(Math.abs(sd - 2) < 0.05, `sd ${sd}`)
  })

  test('fork is repeatable and separate from its parent', () => {
    const parent = createRandom(8)
    const child = parent.fork()
    assert.deepEqual(draw(10, createRandom(8).fork()), draw(10, child))
    assert.notDeepEqual(draw(10, parent), draw(10, createRandom(8).fork()))
  })
})
