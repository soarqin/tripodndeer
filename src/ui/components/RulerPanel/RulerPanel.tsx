import { useGameStore } from '~/ui/store'
import { selectHeir } from '~/engine/systems/ruler/succession'
import { M10_ARCHETYPE_TOOLTIPS } from '~/content/m2/balance'
import styles from './RulerPanel.module.css'

const PERSONALITY_LABELS: Record<string, string> = {
  conqueror: '征服者',
  steward: '治国者',
  schemer: '阴谋家',
  learned: '学者',
  tyrant: '暴君',
  incompetent: '庸主',
  benevolent: '仁君',
  builder: '建设者',
}

const DIMENSION_LABELS: Record<string, string> = {
  attack: '进攻',
  retreat: '撤退',
  'siege-continue': '攻城坚持',
  'cut-supply': '断粮',
  recruit: '招募',
  diplomacy: '外交',
  economy: '内政',
}

export function RulerPanel() {
  const world = useGameStore((state) => state.world)
  const playerRealmId = useGameStore((state) => state.playerRealmId)

  const ruler = world.rulers.get(playerRealmId)
  if (!ruler) return null

  const general = world.generals.get(ruler.generalId)
  if (!general) return null

  const heirId = selectHeir(world, playerRealmId)
  const heir = heirId ? world.generals.get(heirId) : null

  const attrs = general.attrs ?? { wu: 0, zheng: 0, jiao: 0, mou: 0, xue: 0, po: 0 }

  const renderAttr = (key: keyof typeof attrs, label: string, testId: string) => {
    const value = attrs[key]
    const percentage = Math.min(100, Math.max(0, value))
    return (
      <div className={styles.attrRow} data-testid={testId}>
        <span className={styles.attrLabel}>{label}</span>
        <span className={styles.attrValue}>{value}</span>
        <div className={styles.attrBarBg}>
          <div className={styles.attrBarFill} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    )
  }

  const personalityLabel = PERSONALITY_LABELS[ruler.personality] ?? ruler.personality
  const tooltipEntry = M10_ARCHETYPE_TOOLTIPS[ruler.personality]
  const multiplierLines = Object.entries(tooltipEntry.multipliers)
    .map(([dim, val]) => `${DIMENSION_LABELS[dim] ?? dim} ×${val.toFixed(1)}`)
    .join(' / ')
  const personalityTooltip = `${tooltipEntry.name}\n${tooltipEntry.tagline}\n\n决策权重：\n${multiplierLines}`

  return (
    <div className={styles.panel} data-testid="ruler-panel">
      <div className={styles.header}>
        <span className={styles.name}>{general.name}</span>
        <span
          className={styles.personality}
          title={personalityTooltip}
          data-testid="ruler-personality"
        >
          {personalityLabel}
        </span>
      </div>

      <div className={styles.infoRow}>
        <span>年龄: {ruler.age} / {ruler.lifespan}</span>
      </div>

      <div className={styles.healthContainer}>
        <span>健康</span>
        <div className={styles.healthBarBg}>
          <div
            className={styles.healthBarFill}
            style={{
              width: `${ruler.health}%`,
              background: ruler.health > 50 ? '#4caf50' : ruler.health > 20 ? '#ff9800' : '#f44336',
            }}
          />
        </div>
        <span>{ruler.health}</span>
      </div>

      <div className={styles.attrsGrid}>
        {renderAttr('wu', '武', 'ruler-attr-wu')}
        {renderAttr('zheng', '政', 'ruler-attr-zheng')}
        {renderAttr('jiao', '交', 'ruler-attr-jiao')}
        {renderAttr('mou', '谋', 'ruler-attr-mou')}
        {renderAttr('xue', '学', 'ruler-attr-xue')}
        {renderAttr('po', '魄', 'ruler-attr-po')}
      </div>

      <div className={styles.heirPreview} data-testid="ruler-heir-preview">
        <span>储君候选</span>
        <span className={styles.heirName}>{heir ? heir.name : '无'}</span>
      </div>
    </div>
  )
}
