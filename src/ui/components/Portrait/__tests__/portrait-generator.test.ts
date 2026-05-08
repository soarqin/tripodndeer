import { describe, expect, it } from 'vitest'
import { generatePortrait } from '../portrait-generator'

describe('generatePortrait', () => {
  it('starts with <svg', () => {
    const svg = generatePortrait('张仪', 'realm_qin')
    expect(svg.startsWith('<svg')).toBe(true)
  })

  it('SVG text contains compound surname', () => {
    const svg = generatePortrait('司马错', 'realm_qin')
    expect(svg).toContain('>司马<')
  })

  it('is deterministic', () => {
    const svg1 = generatePortrait('张仪', 'realm_qin')
    const svg2 = generatePortrait('张仪', 'realm_qin')
    expect(svg1).toBe(svg2)
  })

  it('distinguishes realms by color', () => {
    const svgQin = generatePortrait('a', 'realm_qin')
    const svgChu = generatePortrait('a', 'realm_chu')
    expect(svgQin).not.toBe(svgChu)
  })

  it('produces 12 unique bg colors for 12 realms', () => {
    const realms = [
      'realm_qin',
      'realm_chu',
      'realm_qi',
      'realm_yan',
      'realm_zhao',
      'realm_wei',
      'realm_han',
      'realm_zhou',
      'realm_yue',
      'realm_song',
      'realm_lu',
      'realm_zhongshan',
    ]
    const colors = new Set()
    for (const realm of realms) {
      const svg = generatePortrait('a', realm)
      const match = svg.match(/fill="([^"]+)"/)
      if (match) {
        colors.add(match[1])
      }
    }
    expect(colors.size).toBe(12)
  })

  it('text contains compound surname for 欧阳', () => {
    const svg = generatePortrait('欧阳修', 'realm_qi')
    expect(svg).toContain('>欧阳<')
  })
})
