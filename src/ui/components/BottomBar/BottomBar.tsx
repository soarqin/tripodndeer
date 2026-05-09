import styles from './BottomBar.module.css'

interface BottomBarProps {
  onWanggong?: () => void
  onJunshi?: () => void
  onShi?: () => void
  onNeizheng?: () => void
  onRencai?: () => void
  onWaijiao?: () => void
  onWenhua?: () => void
  onDiebao?: () => void
  onProvinceBrowser?: () => void
  onRegionBrowser?: () => void
  onCharacterBrowser?: () => void
  onBackToMenu?: () => void
}

const BUTTONS = [
  { id: 'wanggong', label: '王宫', enabled: true },
  { id: 'junshi',   label: '军事', enabled: true },
  { id: 'waijiao',  label: '外交', enabled: true },
  { id: 'neizheng', label: '内政', enabled: true },
  { id: 'codex-toggle', label: '史', enabled: true },
  { id: 'jingji',   label: '经济', enabled: false },
  { id: 'wenhua',   label: '文化', enabled: true },
  { id: 'diebao',   label: '谍报', enabled: true },
  { id: 'rencai',   label: '人才', enabled: true },
  { id: 'province-browser', label: '州郡', enabled: true },
  { id: 'region-browser', label: '地区', enabled: true },
  { id: 'character-browser', label: '名册', enabled: true },
]

export function BottomBar({ onWanggong, onJunshi, onShi, onNeizheng, onRencai, onWaijiao, onWenhua, onDiebao, onProvinceBrowser, onRegionBrowser, onCharacterBrowser, onBackToMenu }: BottomBarProps) {
  return (
    <nav className={styles.bar} data-testid="bottom-bar">
      {BUTTONS.map(({ id, label, enabled }) => (
        <button
          key={id}
          data-testid={`bottom-bar-${id}`}
          className={enabled ? styles.btnEnabled : styles.btnDisabled}
          disabled={!enabled}
          aria-disabled={!enabled}
          onClick={enabled ? (id === 'wanggong' ? onWanggong : id === 'junshi' ? onJunshi : id === 'codex-toggle' ? onShi : id === 'neizheng' ? onNeizheng : id === 'rencai' ? onRencai : id === 'waijiao' ? onWaijiao : id === 'wenhua' ? onWenhua : id === 'diebao' ? onDiebao : id === 'province-browser' ? onProvinceBrowser : id === 'region-browser' ? onRegionBrowser : id === 'character-browser' ? onCharacterBrowser : undefined) : undefined}
        >
          {label}
        </button>
      ))}
      <button
        data-testid="back-to-menu-btn"
        className={styles.btnEnabled}
        onClick={onBackToMenu}
      >
        返回主菜单
      </button>
    </nav>
  )
}
