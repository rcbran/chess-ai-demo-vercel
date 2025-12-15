import './TitleOverlay.css'

interface TitleOverlayProps {
  hidden?: boolean
  onPlayClick?: () => void
  showPlayButton?: boolean
}

export const TitleOverlay = ({ hidden = false, onPlayClick, showPlayButton = false }: TitleOverlayProps) => {
  return (
    <div className={`title-overlay ${hidden ? 'hidden' : ''}`}>
      <h1 className="title">Interactive Chess</h1>
      <p className="subtitle">Click any piece to learn its moves</p>
      
      {showPlayButton && onPlayClick && (
        <div className="play-section">
          <button 
            className="play-button-inline"
            onClick={onPlayClick}
            aria-label="Play against AI"
            tabIndex={hidden ? -1 : 0}
          >
            <span className="play-icon">♔</span>
            <span className="play-text">Play against AI</span>
          </button>
        </div>
      )}
    </div>
  )
}

