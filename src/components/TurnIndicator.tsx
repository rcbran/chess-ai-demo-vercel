import './TurnIndicator.css'

interface TurnIndicatorProps {
  isPlayerTurn: boolean
  isAIThinking: boolean
  isGameOver: boolean
  gameOverMessage?: string
  hidden?: boolean
}

export const TurnIndicator = ({ 
  isPlayerTurn, 
  isAIThinking, 
  isGameOver,
  gameOverMessage,
  hidden = false 
}: TurnIndicatorProps) => {
  if (hidden) return null
  
  const getMessage = (): string => {
    if (isGameOver) return gameOverMessage || 'Game Over'
    if (isAIThinking) return 'Thinking'
    if (isPlayerTurn) return 'Your turn'
    return ''
  }
  
  const message = getMessage()
  if (!message) return null
  
  return (
    <div 
      className={`turn-indicator ${isAIThinking ? 'thinking' : ''} ${isGameOver ? 'game-over' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="turn-text">{message}</span>
      {isAIThinking && (
        <span className="thinking-dots" aria-hidden="true">
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
      )}
    </div>
  )
}

