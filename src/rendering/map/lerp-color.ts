/** 解析 #RRGGBB 为 RGB 分量 */
function parseHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

/** ease-in-out 缓动函数 */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/** 线性插值两个 #RRGGBB 颜色 */
export function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = parseHex(from)
  const [r2, g2, b2] = parseHex(to)
  const eased = easeInOut(Math.max(0, Math.min(1, t)))
  const r = Math.round(r1 + (r2 - r1) * eased)
  const g = Math.round(g1 + (g2 - g1) * eased)
  const b = Math.round(b1 + (b2 - b1) * eased)
  return `rgb(${r},${g},${b})`
}
