import React from 'react'
import styles from './HintModal.module.css'

interface HintModalContentProps {
  body: string
}

export function HintModalContent({ body }: HintModalContentProps) {
  return <div className={styles.body}>{body}</div>
}
