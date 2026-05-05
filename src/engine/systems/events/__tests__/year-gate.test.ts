import { describe, expect, it } from 'vitest'

import { checkEventChainYearGate, checkTrigger } from '../event-chain-engine'
import linXiangruBi from '~/content/m5/events/lin-xiangru-bi.json'
import usurpationChain from '~/content/m6/usurpation-chain.json'
import zhouInvestitureChain from '~/content/m6/zhou-investiture-chain.json'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { EventChain, EventChainTrigger } from '~/shared/types'

const zhouChain = zhouInvestitureChain as EventChain
const usurpation = usurpationChain as EventChain
const linTrigger = linXiangruBi.trigger as EventChainTrigger

describe('event chain year gate', () => {
  it('zhou-investiture does not trigger at 450 BC', () => {
    const world = makeEmptyWorld({ date: { yearBC: 450, season: 'spring', month: 1, xun: 'shang' } })
    expect(checkEventChainYearGate(world, zhouChain)).toBe(false)
  })

  it('zhou-investiture passes at 400 BC', () => {
    const world = makeEmptyWorld({ date: { yearBC: 400, season: 'spring', month: 1, xun: 'shang' } })
    expect(checkEventChainYearGate(world, zhouChain)).toBe(true)
  })

  it('usurpation does not trigger at 350 BC', () => {
    const world = makeEmptyWorld({ date: { yearBC: 350, season: 'spring', month: 1, xun: 'shang' } })
    expect(checkEventChainYearGate(world, usurpation)).toBe(false)
  })

  it('usurpation passes at 340 BC', () => {
    const world = makeEmptyWorld({ date: { yearBC: 340, season: 'spring', month: 1, xun: 'shang' } })
    expect(checkEventChainYearGate(world, usurpation)).toBe(true)
  })

  it('lin_xiangru date trigger still works', () => {
    const world = makeEmptyWorld({ date: { yearBC: 279, season: 'spring', month: 1, xun: 'shang' } })
    expect(checkTrigger(world, linTrigger)).toBe(true)
  })
})
