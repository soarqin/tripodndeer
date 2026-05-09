import { useState } from 'react'
import { useGameStore } from '~/ui/store/game-store'
import { Portrait } from '~/ui/components/Portrait'
import type { General, CharacterTemplate, Site, SiteId } from '~/shared/types'
import styles from './CharacterBrowserPanel.module.css'

type Tab = 'alive' | 'history'

export function CharacterBrowserPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('alive')
  const world = useGameStore(s => s.world)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!world) return null

  const aliveGenerals = [...world.generals.values()]
  const historicalTemplates = [...world.characterTemplates.values()]

  const handleCardClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div data-testid="character-browser-panel" className={styles.panel}>
      <div className={styles.tabs}>
        <button
          data-testid="tab-alive"
          onClick={() => setActiveTab('alive')}
          className={activeTab === 'alive' ? styles.active : ''}
        >
          在世
        </button>
        <button
          data-testid="tab-history"
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? styles.active : ''}
        >
          历史名册
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'alive' && (
          <div className={styles.grid}>
            {aliveGenerals.map(g => (
              <CharacterCard
                key={g.id}
                character={g}
                realmName={world.realms.get(g.realmId)?.displayName ?? '在野'}
                isExpanded={selectedId === g.id}
                onClick={() => handleCardClick(g.id)}
              />
            ))}
          </div>
        )}
        {activeTab === 'history' && (
          historicalTemplates.length === 0 ? (
            <div data-testid="character-browser-empty-state" className={styles.emptyState}>
              暂无历史名册数据
            </div>
          ) : (
            <div className={styles.grid}>
              {historicalTemplates.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  realmName={world.realms.get(t.realmId)?.displayName ?? '在野'}
                  sites={world.sites}
                  isExpanded={selectedId === t.id}
                  onClick={() => handleCardClick(t.id)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function CharacterCard({ character, realmName, isExpanded, onClick }: { character: General, realmName: string, isExpanded: boolean, onClick: () => void }) {
  const openCodex = useGameStore(s => s.openCodex)

  return (
    <div data-testid={`character-card-${character.id}`} className={styles.card} onClick={onClick}>
      <div className={styles.cardHeader}>
        <Portrait name={character.name} realmId={character.realmId} size={40} />
        <div className={styles.cardInfo}>
          <div className={styles.name}>{character.name}</div>
          <div className={styles.realm}>{realmName}</div>
          <div className={styles.specialty}>{character.specialty}</div>
        </div>
        <button
          type="button"
          data-testid={`character-browser-panel-codex-link-${character.id}`}
          onClick={(event) => {
            event.stopPropagation()
            openCodex(`character-${character.id}`)
          }}
        >
          查看 Codex
        </button>
      </div>
      {isExpanded && (
        <div data-testid="character-detail" className={styles.detail}>
          <div className={styles.attributes}>
            <span>武: {character.attrs?.wu ?? character.might}</span>
            <span>政: {character.attrs?.zheng ?? 0}</span>
            <span>交: {character.attrs?.jiao ?? 0}</span>
            <span>谋: {character.attrs?.mou ?? character.strategy ?? 0}</span>
            <span>学: {character.attrs?.xue ?? character.learning ?? 0}</span>
            <span>魄: {character.attrs?.po ?? 0}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template, realmName, sites, isExpanded, onClick }: { template: CharacterTemplate, realmName: string, sites: ReadonlyMap<SiteId, Site>, isExpanded: boolean, onClick: () => void }) {
  const openCodex = useGameStore(s => s.openCodex)
  const name = template.familyName + template.givenName
  const birthplaceSite = sites.get(template.birthplace)
  const birthplaceLabel = birthplaceSite ? birthplaceSite.name : template.birthplace
  return (
    <div data-testid={`character-card-${template.id}`} className={styles.card} onClick={onClick}>
      <div className={styles.cardHeader}>
        <Portrait name={name} realmId={template.realmId} size={40} />
        <div className={styles.cardInfo}>
          <div className={styles.name}>{name}</div>
          <div className={styles.realm}>{realmName}</div>
          <div className={styles.years}>{template.birthYearBC} ~ {template.deathYearBC ?? '?'}</div>
          <div className={styles.specialty}>{template.specialty}</div>
        </div>
        <button
          type="button"
          data-testid={`character-browser-panel-codex-link-${template.id}`}
          onClick={(event) => {
            event.stopPropagation()
            openCodex(`character-${template.id}`)
          }}
        >
          查看 Codex
        </button>
      </div>
      {isExpanded && (
        <div data-testid="character-detail" className={styles.detail}>
          <div className={styles.attributes}>
            <span>武: {template.attributes.wu}</span>
            <span>政: {template.attributes.zheng}</span>
            <span>交: {template.attributes.jiao}</span>
            <span>谋: {template.attributes.mou}</span>
            <span>学: {template.attributes.xue}</span>
            <span>魄: {template.attributes.po}</span>
          </div>
          <div className={styles.birthplace} data-testid="character-birthplace">
            出生地: {birthplaceLabel}
          </div>
          {template.aliases && template.aliases.length > 0 && (
            <div className={styles.aliases} data-testid="character-aliases">别名: {template.aliases.join(', ')}</div>
          )}
          <div className={styles.notes}>{template.historicalNotes}</div>
        </div>
      )}
    </div>
  )
}
