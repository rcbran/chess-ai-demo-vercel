import { useEffect } from 'react'
import type { PieceInfo } from '../data/pieceData'
import './InfoPanel.css'

interface InfoPanelProps {
  piece: PieceInfo
  color: 'white' | 'black'
  onClose: () => void
  isClosing?: boolean
}

export const InfoPanel = ({ piece, color, onClose, isClosing = false }: InfoPanelProps) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={`info-panel ${isClosing ? 'closing' : ''}`}>
      <button 
        className="close-button" 
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={0}
      >
        ×
      </button>
      
      <div className="piece-header">
        <span className={`piece-color ${color}`}>{color}</span>
        <h2 className="piece-title">{piece.title}</h2>
      </div>
      
      <p className="piece-description">{piece.description}</p>
      
      <div className="section">
        <h3>Movement</h3>
        <ul className="movement-list">
          {piece.movement.map((move, index) => (
            <li key={index}>{move}</li>
          ))}
        </ul>
      </div>
      
      {piece.specialRules && piece.specialRules.length > 0 && (
        <div className="section">
          <h3>Special Rules</h3>
          <ul className="special-rules-list">
            {piece.specialRules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="section pattern-section">
        <h3>Movement Pattern</h3>
        <div className="pattern-grid">
          {piece.pattern.map((row, rowIndex) => (
            <div key={rowIndex} className="pattern-row">
              {row.map((cell, cellIndex) => (
                <div 
                  key={cellIndex} 
                  className={`pattern-cell ${
                    cell === 2 ? 'piece-position' : 
                    cell === 1 ? 'can-move' : ''
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="piece-value">
        <span className="value-label">Value:</span>
        <span className="value-amount">{piece.value}</span>
      </div>
      
      <p className="hint">Press ESC, click ×, or click outside to close</p>
    </div>
  )
}

