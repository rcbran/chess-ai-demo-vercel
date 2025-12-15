import './PlayButton.css'

interface PlayButtonProps {
  onClick: () => void
  hidden?: boolean
}

export const PlayButton = ({ onClick, hidden = false }: PlayButtonProps) => {
  return (
    <button 
      className={`play-button ${hidden ? 'hidden' : ''}`}
      onClick={onClick}
      aria-label="Start playing chess"
      tabIndex={hidden ? -1 : 0}
    >
      ♔
    </button>
  )
}
