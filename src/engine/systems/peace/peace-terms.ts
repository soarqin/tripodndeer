import type { PeaceTerm, World } from '~/shared/types'

/**
 * Apply a 'cession' peace term: transfer ownership of ceded sites to the
 * realm currently occupying them (the proposing realm in typical use).
 *
 * If a site has no occupation record, ownership is left unchanged (defensive
 * fallback — should not happen in practice when the term is legitimately
 * negotiated).
 */
export function applyCession(
  world: World,
  term: Extract<PeaceTerm, { type: 'cession' }>,
): World {
  const sites = new Map(world.sites)
  for (const siteId of term.payload.siteIds) {
    const site = sites.get(siteId)
    if (!site) continue
    sites.set(siteId, {
      ...site,
      ownerId: site.occupation?.occupierId ?? site.ownerId,
    })
  }
  return { ...world, sites }
}

/**
 * Apply an 'indemnity' peace term.
 *
 * M2: record only — no treasury / gold field exists yet. The PeaceProposal
 * carries the term and `acknowledgedAt`; the M3 economic system will read
 * accepted proposals and act on them.
 */
export function applyIndemnity(
  world: World,
  _term: Extract<PeaceTerm, { type: 'indemnity' }>,
): World {
  return world
}

/**
 * Apply a 'tribute' peace term.
 *
 * M2: record only. M3 will schedule yearly payments based on
 * `acknowledgedAt` and `payload.years`.
 */
export function applyTribute(
  world: World,
  _term: Extract<PeaceTerm, { type: 'tribute' }>,
): World {
  return world
}
