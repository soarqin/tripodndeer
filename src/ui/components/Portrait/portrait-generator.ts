// Compound surnames (2-char display)
const COMPOUND_SURNAMES = [
  '司马',
  '夏侯',
  '欧阳',
  '上官',
  '公孙',
  '诸葛',
  '司徒',
  '尉迟',
  '皇甫',
  '令狐',
  '宇文',
  '长孙',
]

// Realm color palette (bg, fg)
const REALM_PALETTE: Record<string, { bg: string; fg: string }> = {
  realm_qin: { bg: '#8B0000', fg: '#FFD700' },
  realm_chu: { bg: '#006400', fg: '#FFD700' },
  realm_qi: { bg: '#00008B', fg: '#FFD700' },
  realm_yan: { bg: '#4B0082', fg: '#FFFFFF' },
  realm_zhao: { bg: '#8B4513', fg: '#FFD700' },
  realm_wei: { bg: '#B8860B', fg: '#000000' },
  realm_han: { bg: '#2F4F4F', fg: '#FFD700' },
  realm_zhou: { bg: '#800080', fg: '#FFD700' },
  realm_yue: { bg: '#008080', fg: '#FFFFFF' },
  realm_song: { bg: '#556B2F', fg: '#FFD700' },
  realm_lu: { bg: '#8B6914', fg: '#FFFFFF' },
  realm_zhongshan: { bg: '#483D8B', fg: '#FFD700' },
}
const DEFAULT_PALETTE = { bg: '#555555', fg: '#FFFFFF' }

function getInitial(name: string): string {
  for (const compound of COMPOUND_SURNAMES) {
    if (name.startsWith(compound)) return compound
  }
  return name.charAt(0)
}

export function generatePortrait(name: string, realmId: string, size = 64): string {
  const initial = getInitial(name)
  const { bg, fg } = REALM_PALETTE[realmId] ?? DEFAULT_PALETTE
  const fontSize = initial.length > 1 ? Math.floor(size * 0.35) : Math.floor(size * 0.45)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}" rx="${Math.floor(size * 0.1)}"/><text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" fill="${fg}" font-size="${fontSize}" font-family="serif">${initial}</text></svg>`
}
