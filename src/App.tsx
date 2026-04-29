import React, { useMemo } from 'react'
import { TopBar } from '@/ui/components/TopBar'
import { MapCanvas } from '@/rendering/map'
import { TimeControlBar } from '@/ui/components/TimeControlBar'
import { useRafDriver } from '@/ui/store/raf-driver'
import { useSites, useRealms } from '@/ui/store/selectors'
import styles from './App.module.css'

function useAllRed(): boolean {
  const sites = useSites()
  const realms = useRealms()
  const redId = useMemo(() => {
    for (const [id, realm] of realms) {
      if (realm.displayName === '红') return id
    }
    return 'realm_red'
  }, [realms])

  if (sites.size === 0) return false
  for (const site of sites.values()) {
    if (site.ownerId !== redId) return false
  }
  return true
}

export function App(): React.JSX.Element {
  useRafDriver()
  const allRed = useAllRed()

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.mapContainer}>
        <MapCanvas />
        {allRed && (
          <div className={styles.demoComplete} data-testid="demo-complete">
            演示完成 🎉
          </div>
        )}
      </div>
      <TimeControlBar />
    </div>
  )
}
