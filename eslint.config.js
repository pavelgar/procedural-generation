// @ts-check
import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist/', '.astro/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    // A seed must always draw the same picture: shared links and sketches'
    // default seeds depend on it. So all randomness goes through the seeded rng.
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded rng, so the same seed always draws the same picture.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['es-toolkit', 'es-toolkit/*'],
              importNames: ['shuffle', 'sample', 'sampleSize', 'random', 'randomInt'],
              message: 'These use Math.random and ignore the seed; use the seeded rng instead.',
            },
          ],
        },
      ],
    },
  },
)
