declare const __dirname: string

declare module 'fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
  export function writeFileSync(path: string, data: string, encoding: string): void
}

declare module 'path' {
  export function resolve(...segments: string[]): string
  export function join(...segments: string[]): string
  export function dirname(p: string): string
}

declare const process: {
  cwd(): string
  exit(code?: number): never
  env: Record<string, string | undefined>
}
