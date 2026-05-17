import { useEffect } from 'react'
import { useGameStore } from '@/ui/store/game-store'
import { setIdbEventListener } from '@/ui/store/persistence/db'

const MESSAGE: Record<string, string> = {
  blocked: '存档系统：另一个标签页正在使用，请关闭后重试',
  blocking: '存档系统：检测到版本变更，正在重新连接',
  terminated: '存档系统：连接异常中断，已自动恢复',
}

export function useIdbStatusMonitor(): void {
  useEffect(() => {
    setIdbEventListener((name) => {
      const message = MESSAGE[name] ?? `存档系统：${name}`
      useGameStore.getState().enqueueToast(message)
    })
    return () => setIdbEventListener(null)
  }, [])
}
