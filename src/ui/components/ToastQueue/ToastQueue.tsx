import React, { useEffect } from 'react'
import { useGameStore } from '~/ui/store'
import styles from './ToastQueue.module.css'

export function ToastQueue(): React.JSX.Element | null {
  const toastQueue = useGameStore((state) => state.toastQueue)
  const dismissToast = useGameStore((state) => state.dismissToast)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const state = useGameStore.getState()
      state.toastQueue.forEach((toast) => {
        if (now - toast.createdAt >= toast.durationMs) {
          state.dismissToast(toast.id)
        }
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  if (toastQueue.length === 0) {
    return null
  }

  return (
    <div className={styles.queue} data-testid="toast-queue">
      {toastQueue.map((toast) => (
        <div
          key={toast.id}
          className={styles.toast}
          data-testid={`toast-${toast.id}`}
          onClick={() => dismissToast(toast.id)}
        >
          {toast.text}
        </div>
      ))}
    </div>
  )
}
