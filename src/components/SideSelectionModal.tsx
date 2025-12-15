import { useEffect, useRef } from 'react'
import './SideSelectionModal.css'

interface SideSelectionModalProps {
  isOpen: boolean
  onSelect: (color: 'white' | 'black') => void
  onClose: () => void
}

export const SideSelectionModal = ({ isOpen, onSelect, onClose }: SideSelectionModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const whiteButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      
      // Focus trap: handle Tab key
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          // Shift+Tab on first element: focus last element
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          // Tab on last element: focus first element
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Manage focus when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement
      
      // Focus the first selection button when modal opens
      setTimeout(() => {
        whiteButtonRef.current?.focus()
      }, 100)
    } else if (previouslyFocusedElement.current) {
      // Restore focus when modal closes
      previouslyFocusedElement.current.focus()
      previouslyFocusedElement.current = null
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleWhiteClick = () => {
    onSelect('white')
  }

  const handleBlackClick = () => {
    onSelect('black')
  }

  return (
    <div className="side-selection-overlay" onClick={onClose}>
      <div 
        ref={modalRef}
        className="side-selection-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Close modal"
          tabIndex={0}
        >
          ×
        </button>
        
        <h2 id="modal-title" className="modal-title">Choose Your Side</h2>
        <p className="modal-subtitle">Select which color you want to play</p>
        
        <div className="side-options">
          <button 
            ref={whiteButtonRef}
            className="side-option white-option"
            onClick={handleWhiteClick}
            tabIndex={0}
            aria-label="Play as white"
          >
            <div className="side-icon">♔</div>
            <div className="side-label">Play as White</div>
            <div className="side-description">You move first</div>
          </button>
          
          <button 
            className="side-option black-option"
            onClick={handleBlackClick}
            tabIndex={0}
            aria-label="Play as black"
          >
            <div className="side-icon">♚</div>
            <div className="side-label">Play as Black</div>
            <div className="side-description">AI moves first</div>
          </button>
        </div>
      </div>
    </div>
  )
}
