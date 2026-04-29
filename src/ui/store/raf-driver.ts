import { useEffect } from 'react'
import { MAX_DELTA_MS } from '@/shared/constants'
import { useGameStore } from './game-store'

/**
 * RAF 驱动 hook。
 * - 每帧把 deltaMs cap 到 MAX_DELTA_MS (100ms)，防 tab-background 累积造成的死亡螺旋
 * - mount 时启动，unmount 时停止
 * - 只调用 store.tick；engine 信任输入，cap 责任在 driver 层
 */
export function useRafDriver(): void {
  useEffect(() => {
    let rafId = 0
    let lastTime: number | null = null

    const loop = (now: number): void => {
      if (lastTime !== null) {
        const rawDelta = now - lastTime
        // CAP deltaMs 到 MAX_DELTA_MS（防 tab-background 死亡螺旋）
        const cappedDelta = Math.min(rawDelta, MAX_DELTA_MS)
        useGameStore.getState().tick(cappedDelta)
      }
      lastTime = now
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])
}
