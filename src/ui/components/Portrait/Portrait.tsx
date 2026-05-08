import React from 'react'
import { generatePortrait } from './portrait-generator'
import styles from './Portrait.module.css'

interface PortraitProps {
  name: string
  realmId: string
  size?: number
}

export function Portrait({ name, realmId, size = 64 }: PortraitProps): React.JSX.Element {
  const svg = generatePortrait(name, realmId, size)
  return (
    <span
      className={styles.portrait}
      data-testid="portrait"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ display: 'inline-block', width: size, height: size }}
    />
  )
}
