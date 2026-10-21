export const site = {
  title: 'Procedural',
  description: 'Experiments in procedural generation.',
}

/** A site path with the configured base prepended, for hosting under a subpath (e.g. GitHub Pages). */
export function href(path = '') {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}
