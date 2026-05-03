import React, { useState } from 'react'
import { useGameStore } from '~/ui/store/game-store'
import styles from './CulturePanel.module.css'

type CultureTab = 'cultural' | 'ideology' | 'academy'

export function CulturePanel() {
  const [activeTab, setActiveTab] = useState<CultureTab>('cultural')
  const world = useGameStore(s => s.world)
  const playerRealmId = world?.playerRealmId
  const playerRealm = world?.realms.get(playerRealmId ?? '')
  
  return (
    <div data-testid="culture-panel" className={styles.culturePanel}>
      <div className={styles.tabs}>
        <button 
          data-testid="culture-tab-cultural"
          onClick={() => setActiveTab('cultural')}
          className={activeTab === 'cultural' ? styles.active : ''}
        >文化</button>
        <button 
          data-testid="culture-tab-ideology"
          onClick={() => setActiveTab('ideology')}
          className={activeTab === 'ideology' ? styles.active : ''}
        >意识形态</button>
        <button 
          data-testid="culture-tab-academy"
          onClick={() => setActiveTab('academy')}
          className={activeTab === 'academy' ? styles.active : ''}
        >学宫</button>
      </div>
      
      <div className={styles.content}>
        {activeTab === 'cultural' && <CulturalMapTab world={world} playerRealmId={playerRealmId} />}
        {activeTab === 'ideology' && <IdeologyRadarTab realm={playerRealm} />}
        {activeTab === 'academy' && <AcademyListTab world={world} />}
      </div>
    </div>
  )
}

function CulturalMapTab({ world, playerRealmId }: { world: any, playerRealmId: string }) {
  if (!world) return null
  const playerSites = [...world.sites.values()].filter(s => s.ownerId === playerRealmId)
  return (
    <div data-testid="cultural-map-tab" className={styles.tabContent}>
      {playerSites.map(site => (
        <div key={site.id} className={styles.siteRow}>
          <span>{site.id}</span>
          <span>{site.cultural}</span>
          <div className={styles.identityBarContainer}>
            <div className={styles.identityBar} style={{ width: `${site.culturalIdentityStrength}%` }} />
          </div>
          <span>{site.culturalIdentityStrength}%</span>
        </div>
      ))}
    </div>
  )
}

function IdeologyRadarTab({ realm }: { realm: any }) {
  if (!realm) return null
  const ideologies = ['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing'] as const
  const size = 200
  const center = size / 2
  const radius = 80
  const points = ideologies.map((ideology, i) => {
    const angle = (i / ideologies.length) * 2 * Math.PI - Math.PI / 2
    const value = (realm.ideologyLean?.[ideology] ?? 0) / 100
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    }
  })
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ')
  
  return (
    <div data-testid="ideology-radar-tab" className={styles.tabContent}>
      <svg width={size} height={size}>
        <polygon points={polygonPoints} fill="rgba(100,150,200,0.3)" stroke="steelblue" />
        {ideologies.map((ideology, i) => {
          const angle = (i / ideologies.length) * 2 * Math.PI - Math.PI / 2
          const labelX = center + (radius + 15) * Math.cos(angle)
          const labelY = center + (radius + 15) * Math.sin(angle)
          return (
            <text key={ideology} x={labelX} y={labelY} textAnchor="middle" fontSize="12" fill="currentColor">
              {ideology}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function AcademyListTab({ world }: { world: any }) {
  if (!world) return null
  const academies = [...world.academies.values()]
  return (
    <div data-testid="academy-list-tab" className={styles.tabContent}>
      {academies.map(academy => (
        <div key={academy.id} className={styles.academyRow}>
          <span>{academy.id}</span>
          <span>{academy.hostRealmId}</span>
          <span>{academy.primaryIdeology}</span>
          <span>{academy.status}</span>
        </div>
      ))}
    </div>
  )
}
