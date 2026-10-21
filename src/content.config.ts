import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const projects = defineCollection({
  // Each folder in projects/ is one project; its id (and URL) is the folder name.
  loader: glob({
    pattern: '*/index.mdx',
    base: './projects',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      /** Gallery image. Without one, the gallery renders the sketch live. */
      cover: image().optional(),
      /** Drafts are listed in dev only. */
      draft: z.boolean().default(false),
    }),
})

export const collections = { projects }
