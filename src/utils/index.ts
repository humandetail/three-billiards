export function getTexturePath(name: string): string {
  const PATHNAME = import.meta.env.VITE_APP_PATHNAME || '/'
  return `${PATHNAME.replace(/\/$/, '')}/textures/${name}`
}
