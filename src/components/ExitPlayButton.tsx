import './ExitPlayButton.css'

interface GameControlsProps {
  onExitToDemo: () => void
  onResetBoard: () => void
  hidden?: boolean
}

export const GameControls = ({ onExitToDemo, onResetBoard, hidden = false }: GameControlsProps) => {
  return (
    <div className={`game-controls ${hidden ? 'hidden' : ''}`}>
      <button 
        className="game-control-button"
        onClick={onExitToDemo}
        aria-label="Exit to demo mode"
        tabIndex={hidden ? -1 : 0}
      >
        ← Demo
      </button>
      <button 
        className="game-control-button reset-button"
        onClick={onResetBoard}
        aria-label="Reset board to starting position"
        tabIndex={hidden ? -1 : 0}
      >
        ↺ Reset
      </button>
    </div>
  )
}

// Keep backwards compatibility
interface ExitPlayButtonProps {
  onClick: () => void
  hidden?: boolean
}

export const ExitPlayButton = ({ onClick, hidden = false }: ExitPlayButtonProps) => {
  return (
    <button 
      className={`exit-play-button ${hidden ? 'hidden' : ''}`}
      onClick={onClick}
      aria-label="Exit to demo mode"
      tabIndex={hidden ? -1 : 0}
    >
      ← Demo
    </button>
  )
}
