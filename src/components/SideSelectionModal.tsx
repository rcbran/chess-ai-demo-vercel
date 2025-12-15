import { useEffect } from 'react'
import './SideSelectionModal.css'

interface SideSelectionModalProps {
  isOpen: boolean
  onSelect: (color: 'white' | 'black') => void
  onClose: () => void
}

export const SideSelectionModal = ({ isOpen, onSelect, onClose }: SideSelectionModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleWhiteClick = () => {
    onSelect('white')
  }

  const handleBlackClick = () => {
    onSelect('black')
  }

  return (
    <div className="side-selection-overlay" onClick={onClose}>
      <div className="side-selection-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Close modal"
          tabIndex={0}
        >
          ×
        </button>
        
        <h2 className="modal-title">Choose Your Side</h2>
        <p className="modal-subtitle">Select which color you want to play</p>
        
        <div className="side-options">
          <button 
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
