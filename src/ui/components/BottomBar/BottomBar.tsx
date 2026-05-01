import styles from './BottomBar.module.css'

interface BottomBarProps {
  onWanggong?: () => void
  onJunshi?: () => void
  onNeizheng?: () => void
  onRencai?: () => void
}

const BUTTONS = [
  { id: 'wanggong', label: '王宫', enabled: true },
  { id: 'junshi',   label: '军事', enabled: true },
  { id: 'waijiao',  label: '外交', enabled: false },
  { id: 'neizheng', label: '内政', enabled: true },
  { id: 'jingji',   label: '经济', enabled: false },
  { id: 'wenhua',   label: '文化', enabled: false },
  { id: 'diebao',   label: '谍报', enabled: false },
  { id: 'rencai',   label: '人才', enabled: true },
]

export function BottomBar({ onWanggong, onJunshi, onNeizheng, onRencai }: BottomBarProps) {
  return (
    <nav className={styles.bar} data-testid="bottom-bar">
      {BUTTONS.map(({ id, label, enabled }) => (
        <button
          key={id}
          data-testid={`bottom-bar-${id}`}
          className={enabled ? styles.btnEnabled : styles.btnDisabled}
          disabled={!enabled}
          aria-disabled={!enabled}
          onClick={enabled ? (id === 'wanggong' ? onWanggong : id === 'junshi' ? onJunshi : id === 'neizheng' ? onNeizheng : id === 'rencai' ? onRencai : undefined) : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
