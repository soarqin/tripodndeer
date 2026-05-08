import { useEffect } from 'react'
import { MAX_DELTA_MS } from '@/shared/constants'
import { detectCriticalEvent } from './critical-events'
import { useGameStore } from './game-store'
import { M10_AUTOSAVE_INTERVAL } from '@/content/m2/balance'
import { worldToSaveDTO } from '@/engine/world/save-dto'
import { saveSlot } from './persistence/slot-crud'

/**
 * RAF 驱动 hook。
 * - 每帧把 deltaMs cap 到 MAX_DELTA_MS (100ms)，防 tab-background 累积造成的死亡螺旋
 * - mount 时启动，unmount 时停止
 * - 只调用 store.tick；engine 信任输入，cap 责任在 driver 层
 * - 订阅 store.events 变化，对涉及玩家 realm 的重大事件自动暂停时钟
 */
export function useRafDriver(): void {
  useEffect(() => {
    let rafId = 0
    let lastTime: number | null = null

    const loop = (now: number): void => {
      if (lastTime !== null) {
        const rawDelta = now - lastTime
        const cappedDelta = Math.min(rawDelta, MAX_DELTA_MS)
        const store = useGameStore.getState()
        const oldTick = store.world.tick
        store.tick(cappedDelta)
        const newWorld = useGameStore.getState().world
        
        if (newWorld.tick > oldTick && newWorld.tick % M10_AUTOSAVE_INTERVAL === 0 && newWorld.tick > 0) {
          const scenarioId: 'm1' | 'm9' = newWorld.sites.size === 250 ? 'm9' : 'm1'
          const dto = worldToSaveDTO(newWorld, scenarioId)
          const playerRealm = newWorld.realms.get(newWorld.playerRealmId)
          const metadata = { 
            slotId: 'auto', 
            name: '自动存档', 
            createdAt: Date.now(), 
            tick: newWorld.tick, 
            scenarioId, 
            playerRealmName: playerRealm ? playerRealm.displayName : '未知势力' 
          }
          saveSlot('auto', dto, metadata).catch(() => {})
        }
      }
      lastTime = now
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.events === prevState.events) return
      if (state.events.length === 0) return

      for (const event of state.events) {
        const critical = detectCriticalEvent(event, state.playerRealmId)
        if (critical !== null) {
          state.pauseOnCriticalEvent(critical.type, critical.payload)
          break
        }
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      unsubscribe()
    }
  }, [])
}
