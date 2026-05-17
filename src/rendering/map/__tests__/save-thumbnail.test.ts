import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateThumbnail } from '../save-thumbnail'
import { createWorldFromM1Data, loadM1Data } from '@/engine/world/factory'

describe('save-thumbnail', () => {
  beforeEach(() => {
    global.Path2D = class {
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      closePath() {}
    } as unknown as typeof Path2D

    const mockContext = {
      fillRect: vi.fn(),
      scale: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    }

    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => mockContext,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mocked-base64-data')
  })

  it('generates a valid data URL thumbnail', async () => {
    const m1Data = loadM1Data()
    const world = createWorldFromM1Data(m1Data, 42, 'realm_qin')

    const thumbnail = await generateThumbnail(world)
    
    expect(thumbnail).toMatch(/^data:image\/png;base64,/)
    
    // Check size < 50KB
    // Base64 string length * 0.75 gives approximate byte size
    const sizeInBytes = thumbnail.length * 0.75
    expect(sizeInBytes).toBeLessThan(50 * 1024)
    
    // Write evidence
    const fs = await import('fs')
    fs.writeFileSync('.sisyphus/evidence/task-18-thumbnail-size.txt', `Thumbnail size: ${Math.round(sizeInBytes)} bytes`, 'utf-8')
  })
})
