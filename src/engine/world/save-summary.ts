import { World, ScenarioId } from '~/shared/types'

const TICKS_PER_YEAR = 36

function toChineseNumeral(n: number): string {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const units = ['', '十', '百', '千']

  if (n === 0) return digits[0] || '〇'
  if (n === 10) return '十'
  if (n < 10) return digits[n] || ''

  let res = ''
  const s = n.toString()
  for (let i = 0; i < s.length; i++) {
    const d = parseInt(s[i] || '0')
    const pos = s.length - i - 1
    if (d !== 0) {
      if (pos === 1 && d === 1 && s.length === 2) {
        res += units[pos] || ''
      } else {
        res += (digits[d] || '') + (units[pos] || '')
      }
    } else {
      if (res !== '' && !res.endsWith(digits[0] || '〇') && pos !== 0) {
        res += digits[0] || '〇'
      }
    }
  }

  if (res.endsWith(digits[0] || '〇') && res.length > 1) {
    res = res.slice(0, -1)
  }

  return res
}

export function generateSummary(world: World, scenarioId: ScenarioId): string {
  const playerRealmId = world.playerRealmId
  const ruler = world.rulers?.get(playerRealmId)
  const playerRealm = world.realms?.get(playerRealmId)

  let dateStr = ''

  if (scenarioId === 'tutorial') {
    dateStr = `公元前${toChineseNumeral(world.date.yearBC)}年`
  } else if (ruler) {
    const general = world.generals.get(ruler.generalId)
    const rulerName = general?.name ?? playerRealm?.displayName ?? ''
    const reignYear = Math.floor((world.tick - ruler.inOfficeSinceTick) / TICKS_PER_YEAR) + 1
    dateStr = `${rulerName}${toChineseNumeral(reignYear)}年`
  } else {
    const zhouYear = 314 - world.date.yearBC + 1
    if (zhouYear > 0 && zhouYear <= 59) {
      dateStr = `周赧王${toChineseNumeral(zhouYear)}年`
    } else {
      dateStr = `公元前${toChineseNumeral(world.date.yearBC)}年`
    }
  }

  let eventStr = ''

  const activeWars = [...(world.wars?.entries() || [])].filter(([key]) => {
    const [a, b] = key.split(':')
    return a === playerRealmId || b === playerRealmId
  })

  if (activeWars.length > 0) {
    const firstWar = activeWars[0]
    if (firstWar) {
      const [key] = firstWar
      const [a, b] = key.split(':')
      const targetId = a === playerRealmId ? b : a
      const targetRealm = targetId ? world.realms?.get(targetId) : undefined
      if (targetRealm) {
        eventStr = `伐${targetRealm.displayName}`
      }
    }
  }

  if (!eventStr && world.diplomacyHistory && world.diplomacyHistory.length > 0) {
    const recentEvents = world.diplomacyHistory.filter(
      e => e.actorRealmId === playerRealmId || e.targetRealmId === playerRealmId,
    )

    if (recentEvents.length > 0) {
      const lastEvent = recentEvents[recentEvents.length - 1]
      if (lastEvent) {
        if (lastEvent.kind === 'war_declared') {
          const targetId =
            lastEvent.actorRealmId === playerRealmId ? lastEvent.targetRealmId : lastEvent.actorRealmId
          const targetRealm = targetId ? world.realms?.get(targetId) : null
          if (targetRealm) eventStr = `伐${targetRealm.displayName}`
        } else if (lastEvent.kind === 'proposal_resolved' || lastEvent.kind === 'treaty_created') {
          eventStr = '盟'
        }
      }
    }
  }

  const summary = eventStr ? `${dateStr}，${eventStr}` : dateStr

  return summary.slice(0, 49)
}
