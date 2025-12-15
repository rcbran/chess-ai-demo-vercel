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
            aria-label="Start playing chess"
            tabIndex={hidden ? -1 : 0}
          >
            ♔
          </button>
          <span className="play-text">Press to play against AI</span>
        </div>
      )}
    </div>
  )
}

