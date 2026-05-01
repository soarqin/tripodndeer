import React, { useEffect, useRef } from 'react'
import styles from './Modal.module.css'

export interface ModalAction {
  id: string
  label: string
  onClick: () => void
  primary?: boolean
}

export interface ModalProps {
  title: string
  content: React.ReactNode
  actions: ModalAction[]
  dismissable?: boolean
  onClose: () => void
}

export function Modal({ title, content, actions, dismissable = true, onClose }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        
        const elements = Array.from(focusableElements)
        if (elements.length === 0) return

        const firstElement = elements[0]!
        const lastElement = elements[elements.length - 1]!

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dismissable, onClose])

  useEffect(() => {
    if (modalRef.current) {
      const firstButton = modalRef.current.querySelector('button')
      if (firstButton) {
        firstButton.focus()
      }
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && dismissable) {
      onClose()
    }
  }

  return (
    <div 
      className={styles.backdrop} 
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
    >
      <div 
        className={styles.modal} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        data-testid="generic-modal"
        ref={modalRef}
      >
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>{title}</h2>
        </div>
        <div className={styles.content}>
          {content}
        </div>
        <div className={styles.footer}>
          {actions.map((action) => (
            <button
              key={action.id}
              className={`${styles.button} ${action.primary ? styles.primary : ''}`}
              onClick={action.onClick}
              data-testid={`modal-action-${action.id}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
