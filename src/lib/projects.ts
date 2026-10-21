import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getCollection, type CollectionEntry } from 'astro:content'

export type Project = CollectionEntry<'projects'>

/** Published projects, newest first. Drafts show up in dev only. */
export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection('projects', ({ data }) => import.meta.env.DEV || !data.draft)
  return projects.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

/** Whether the project has a sketch.ts next to its index.mdx. */
export function hasSketch(project: Project): boolean {
  return !!project.filePath && existsSync(join(dirname(project.filePath), 'sketch.ts'))
}
