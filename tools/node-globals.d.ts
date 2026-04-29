declare const __dirname: string

declare module 'path' {
  export function resolve(...segments: string[]): string
}
