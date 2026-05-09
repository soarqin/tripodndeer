import React, { useState, useMemo, useEffect } from 'react'
import { useGameStore } from '~/ui/store/game-store'
import { loadStaticEntries, deriveCharacterEntries } from './codex-data-loader'
import { renderMarkdown } from './markdown-renderer'
import { CODEX_EMPTY_STATE_M1_CHARACTERS, CODEX_EMPTY_SEARCH_RESULTS } from '~/content/codex/empty-state-messages'
import type { CodexCategory } from './codex-types'
import styles from './CodexPanel.module.css'

export function CodexPanel() {
  const activePanel = useGameStore(s => s.activePanel)
  const selectedCodexEntryId = useGameStore(s => s.selectedCodexEntryId)
  const world = useGameStore(s => s.world)
  const closeCodex = useGameStore(s => s.closeCodex)
  const selectCodexEntry = useGameStore(s => s.selectCodexEntry)

  const [activeCategory, setActiveCategory] = useState<CodexCategory>('mechanics')
  const [searchQuery, setSearchQuery] = useState('')

  const { allEntries, entryIds, characterEntriesCount } = useMemo(() => {
    if (!world) return { allEntries: [], entryIds: new Set<string>(), characterEntriesCount: 0 }
    const staticEntries = loadStaticEntries()
    const characterEntries = deriveCharacterEntries(world)
    const all = [...staticEntries, ...characterEntries]
    return {
      allEntries: all,
      entryIds: new Set(all.map(e => e.id)),
      characterEntriesCount: characterEntries.length
    }
  }, [world])

  useEffect(() => {
    if (selectedCodexEntryId) {
      const entry = allEntries.find(e => e.id === selectedCodexEntryId)
      if (entry && entry.category !== activeCategory) {
        setActiveCategory(entry.category)
        setSearchQuery('')
      }
    }
  }, [selectedCodexEntryId, allEntries, activeCategory])

  if (activePanel !== 'codex' || !world) return null

  const handleCategoryClick = (category: CodexCategory) => {
    setActiveCategory(category)
    setSearchQuery('')
  }

  const handleEntryClick = (id: string) => {
    selectCodexEntry(id)
  }

  const handleLinkClick = (id: string) => {
    selectCodexEntry(id)
  }

  const filteredEntries = allEntries.filter(e => {
    if (e.category !== activeCategory) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return e.title.toLowerCase().includes(query) || e.body.toLowerCase().includes(query)
  })

  const selectedEntry = allEntries.find(e => e.id === selectedCodexEntryId)

  const categories: { id: CodexCategory; label: string }[] = [
    { id: 'mechanics', label: '机制' },
    { id: 'history', label: '历史' },
    { id: 'characters', label: '人物' }
  ]

  return (
    <div className={styles.overlay} data-testid="codex-panel">
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title} data-testid="codex-panel-title">史书百科</div>
          <button 
            className={styles.closeButton} 
            onClick={closeCodex}
            data-testid="codex-panel-close"
          >
            ×
          </button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.sidebar}>
            {categories.map(cat => {
              const count = allEntries.filter(e => e.category === cat.id).length
              return (
                <div key={cat.id} className={styles.category}>
                  <div 
                    className={styles.categoryTitle}
                    onClick={() => handleCategoryClick(cat.id)}
                    data-testid={`codex-category-${cat.id}`}
                  >
                    {cat.label} ({count})
                  </div>
                  {activeCategory === cat.id && (
                    <div className={styles.entryList}>
                      {filteredEntries.map(entry => (
                        <div 
                          key={entry.id}
                          className={`${styles.entryItem} ${selectedCodexEntryId === entry.id ? styles.selected : ''}`}
                          onClick={() => handleEntryClick(entry.id)}
                          data-testid={`codex-entry-${entry.id}`}
                        >
                          {entry.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className={styles.mainArea}>
            <div className={styles.searchBox}>
              <input 
                type="text" 
                className={styles.searchInput}
                placeholder="搜索条目..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                data-testid="codex-search-input"
              />
            </div>
            
            <div className={styles.detailView}>
              {activeCategory === 'characters' && characterEntriesCount === 0 ? (
                <div className={styles.emptyState} data-testid="codex-empty-state-m1">
                  {CODEX_EMPTY_STATE_M1_CHARACTERS}
                </div>
              ) : searchQuery && filteredEntries.length === 0 ? (
                <div className={styles.emptyState} data-testid="codex-search-empty">
                  {CODEX_EMPTY_SEARCH_RESULTS}
                </div>
              ) : !selectedCodexEntryId ? (
                <div className={styles.emptyState} data-testid="codex-detail-empty">
                  请从左侧选择条目
                </div>
              ) : selectedEntry ? (
                <div data-testid="codex-detail">
                  {renderMarkdown(selectedEntry.body, { entryIds, onLinkClick: handleLinkClick })}
                </div>
              ) : (
                <div className={styles.emptyState} data-testid="codex-detail-empty">
                  条目未找到
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
