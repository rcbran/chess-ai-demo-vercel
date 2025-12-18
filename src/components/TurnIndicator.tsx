import './TurnIndicator.css'

export interface GameRecord {
  wins: number
  losses: number
  draws: number
}

interface TurnIndicatorProps {
  isPlayerTurn: boolean
  isAIThinking: boolean
  isGameOver: boolean
  isPlayerLoss?: boolean
  gameOverMessage?: string
  record?: GameRecord
  hidden?: boolean
}

export const TurnIndicator = ({ 
  isPlayerTurn, 
  isAIThinking, 
  isGameOver,
  isPlayerLoss = false,
  gameOverMessage,
  record,
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
  const gameOverClass = isGameOver ? (isPlayerLoss ? 'game-over-loss' : 'game-over') : ''
  
  return (
    <>
      {/* Turn indicator - centered at top */}
      {message && (
        <div className="turn-indicator-container">
          <div 
            className={`turn-indicator ${isAIThinking ? 'thinking' : ''} ${gameOverClass}`}
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
        </div>
      )}
      
      {/* Game record - top left corner */}
      {record && (
        <div className="game-record" aria-label={`Wins: ${record.wins}, Losses: ${record.losses}, Draws: ${record.draws}`}>
          <div className="record-row">
            <span className="record-label">Win:</span>
            <span className="record-value">{record.wins}</span>
          </div>
          <div className="record-row">
            <span className="record-label">Loss:</span>
            <span className="record-value">{record.losses}</span>
          </div>
          <div className="record-row">
            <span className="record-label">Draw:</span>
            <span className="record-value">{record.draws}</span>
          </div>
        </div>
      )}
    </>
  )
}

