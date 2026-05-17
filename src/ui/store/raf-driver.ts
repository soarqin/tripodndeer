import { useEffect } from 'react'
import { MAX_DELTA_MS } from '@/shared/constants'
import { detectCriticalEvent } from './critical-events'
import { getSeverity } from './notification-severity-map'
import { useGameStore } from './game-store'
import { M10_AUTOSAVE_INTERVAL } from '@/content/m2/balance'
import { worldToSaveDTO } from '@/engine/world/save-dto'
import { writeAutoRingBuffer } from './persistence/auto-ring-buffer'

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
    let lastSavedYearBC: number | null = useGameStore.getState().world?.date.yearBC ?? null

    const queueAutosave = (world = useGameStore.getState().world, name = '自动存档'): void => {
      const scenarioId = world.scenarioId
      const hintState = useGameStore.getState()
      const dto = worldToSaveDTO(world, scenarioId, {
        seenHints: hintState.seenHints,
        hintsEnabled: hintState.hintsEnabled,
      })
      const playerRealm = world.realms.get(world.playerRealmId)
      const metadata = {
        slotId: 'auto_0',
        name,
        createdAt: Date.now(),
        tick: world.tick,
        scenarioId,
        playerRealmName: playerRealm ? playerRealm.displayName : '未知势力',
      }
      writeAutoRingBuffer(dto, metadata).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        useGameStore.getState().enqueueToast('[错误] 自动存档失败：' + msg, 5000)
        console.error('[autosave] failed', err)
      })
    }

    const loop = (now: number): void => {
      if (lastTime !== null) {
        const rawDelta = now - lastTime
        const cappedDelta = Math.min(rawDelta, MAX_DELTA_MS)
        const store = useGameStore.getState()
        const oldTick = store.world.tick
        store.tick(cappedDelta)
        const newWorld = useGameStore.getState().world

        const currentYearBC = newWorld.date.yearBC
        if (lastSavedYearBC !== null && currentYearBC !== lastSavedYearBC) {
          queueAutosave(newWorld, `自动存档 (${Math.abs(currentYearBC)} BC)`)
          lastSavedYearBC = currentYearBC
        } else if (lastSavedYearBC === null) {
          lastSavedYearBC = currentYearBC
        }

        if (newWorld.tick > oldTick && newWorld.tick % M10_AUTOSAVE_INTERVAL === 0 && newWorld.tick > 0 && useGameStore.getState().bootStatus === 'ready') {
          queueAutosave(newWorld)
        }
      }
      lastTime = now
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    const onVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') return
      const world = useGameStore.getState().world
      if (world && lastSavedYearBC !== null && world.date.yearBC !== lastSavedYearBC) {
        queueAutosave(world, `自动存档 (${Math.abs(world.date.yearBC)} BC)`)
        lastSavedYearBC = world.date.yearBC
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.events === prevState.events) return
      if (state.events.length === 0) return

      let criticalHandled = false
      for (const event of state.events) {
        if (!criticalHandled) {
          const critical = detectCriticalEvent(event, state.playerRealmId)
          if (critical !== null) {
            state.pauseOnCriticalEvent(critical.type, critical.payload)
            criticalHandled = true
          }
        }

        const severity = getSeverity(event, state.playerRealmId)
        if (severity === 'hidden') continue
        const text = `[${event.type}]`

        if (severity === 'L2') {
          state.enqueueToast(text)
        } else if (severity === 'L3') {
          state.showBanner(text)
        }

        state.appendEventLog({
          id: `${event.type}-${state.world.tick}-${Math.random()}`,
          tick: state.world.tick,
          type: event.type,
          text,
          createdAt: Date.now(),
        })
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      unsubscribe()
    }
  }, [])
}
