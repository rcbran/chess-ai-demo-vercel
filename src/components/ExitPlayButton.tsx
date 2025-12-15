import './ExitPlayButton.css'

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
