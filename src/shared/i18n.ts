export function loadLocale(json: unknown): ReadonlyMap<string, string> {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error('Invalid locale data: expected object')
  }

  const map = new Map<string, string>()
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      throw new Error(`Invalid locale value for key "${key}": expected string`)
    }
    map.set(key, value)
  }
  return map
}

export function t(
  localization: ReadonlyMap<string, string>,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = localization.get(key)
  if (template === undefined) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      return `[MISSING:${key}]`
    }
    const parts = key.split('.')
    return parts[parts.length - 1] ?? key
  }

  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const val = params[name]
    return val !== undefined ? String(val) : `{{${name}}}`
  })
}
