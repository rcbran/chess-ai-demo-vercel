import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { AboutModal, AboutButton } from './components/AboutModal'
import { SideSelectionModal } from './components/SideSelectionModal'
import { GameControls } from './components/ExitPlayButton'
import { TurnIndicator, type GameRecord } from './components/TurnIndicator'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { InfoPanel } from './components/InfoPanel'
import { Loader } from './components/Loader'
import { TitleOverlay } from './components/TitleOverlay'
import { Effects } from './components/Effects'
import { AnimatedBackground, AmbientParticles } from './components/AnimatedBackground'
import { pieceData, type PieceType } from './data/pieceData'
import type { Color, GameState, Position } from './game/types'
import { initializeGameState, getValidMoves, getPieceAt, makeMove, gameStateToFen, positionToSquare } from './game/chessEngine'
import { StockfishAI } from './game/ai'
import './App.css'

type GameMode = 'demo' | 'play'

interface SelectedPiece {
  type: PieceType
  color: 'white' | 'black'
  meshName: string
  side: 'left' | 'right'
}

const STORAGE_KEY = 'chess-ai-game-record'

const loadGameRecord = (): GameRecord => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        wins: parsed.wins ?? 0,
        losses: parsed.losses ?? 0,
        draws: parsed.draws ?? 0,
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { wins: 0, losses: 0, draws: 0 }
}

const saveGameRecord = (record: GameRecord): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Ignore storage errors
  }
}

const App = () => {
  // Game mode state
  const [gameMode, setGameMode] = useState<GameMode>('demo')
  const [playerColor, setPlayerColor] = useState<Color | null>(null)
  const [isSideSelectionOpen, setIsSideSelectionOpen] = useState(false)
  
  // Play mode state
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])
  const [isMoveInProgress, setIsMoveInProgress] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const stockfishRef = useRef<StockfishAI | null>(null)
  
  // Demo mode state
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null)
  const [displayedPiece, setDisplayedPiece] = useState<SelectedPiece | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  
  // Win/loss tracking
  const [gameRecord, setGameRecord] = useState<GameRecord>(loadGameRecord)
  const gameEndedRef = useRef(false)

  // Cleanup Stockfish on unmount
  useEffect(() => {
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate()
        stockfishRef.current = null
      }
    }
  }, [])

  // Initialize Stockfish when entering play mode (async, non-blocking)
  useEffect(() => {
    if (gameMode === 'play' && playerColor && !stockfishRef.current) {
      const initAI = async () => {
        try {
          stockfishRef.current = new StockfishAI()
          await stockfishRef.current.initialize({ depth: 15, skillLevel: 20 })
          stockfishRef.current.newGame()
        } catch (error) {
          console.error('Failed to initialize Stockfish:', error)
        }
      }
      initAI()
    }
  }, [gameMode, playerColor])

  // Game mode handlers
  const handlePlayButtonClick = useCallback(() => {
    setGameMode('play')
    setIsSideSelectionOpen(true)
  }, [])

  const handleSideSelection = useCallback((color: Color) => {
    setPlayerColor(color)
    setIsSideSelectionOpen(false)
    
    // Initialize game state - player always moves first
    const newGameState = initializeGameState()
    newGameState.currentTurn = color
    setGameState(newGameState)
    setSelectedSquare(null)
    setValidMoves([])
    gameEndedRef.current = false
  }, [])

  const handleCloseSideSelection = useCallback(() => {
    // If user closes modal without selecting, return to demo mode
    setIsSideSelectionOpen(false)
    setGameMode('demo')
    setPlayerColor(null)
  }, [])

  const handleExitToDemo = useCallback(() => {
    setGameMode('demo')
    setPlayerColor(null)
    setIsSideSelectionOpen(false)
    // Clear game state
    setGameState(null)
    setSelectedSquare(null)
    setValidMoves([])
    setIsAIThinking(false)
    
    // Terminate Stockfish
    if (stockfishRef.current) {
      stockfishRef.current.terminate()
      stockfishRef.current = null
    }
  }, [])

  const handleResetBoard = useCallback(() => {
    if (!playerColor) return
    
    // Re-initialize game state with current player color
    const newGameState = initializeGameState()
    newGameState.currentTurn = playerColor
    setGameState(newGameState)
    setSelectedSquare(null)
    setValidMoves([])
    setIsMoveInProgress(false)
    setIsAIThinking(false)
    gameEndedRef.current = false
    
    // Reset Stockfish for new game
    if (stockfishRef.current) {
      stockfishRef.current.stop()
      stockfishRef.current.newGame()
    }
  }, [playerColor])

  const handlePieceClick = useCallback((
    pieceType: PieceType, 
    color: 'white' | 'black', 
    meshName: string,
    screenX: number
  ) => {
    // Only handle piece clicks in demo mode
    if (gameMode !== 'demo') {
      return
    }
    
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    
    // Determine which side to show the panel on (opposite of where piece was clicked)
    // screenX is normalized from -1 (left) to 1 (right)
    const side: 'left' | 'right' = screenX > 0 ? 'left' : 'right'
    
    // If any piece is already selected (modal is open), just close it
    if (selectedPiece) {
      setIsClosing(true)
      closeTimeoutRef.current = window.setTimeout(() => {
        setSelectedPiece(null)
        setDisplayedPiece(null)
        setIsClosing(false)
      }, 250)
    } else {
      // No piece selected, open new piece
      setIsClosing(false)
      setSelectedPiece({ type: pieceType, color, meshName, side })
      setDisplayedPiece({ type: pieceType, color, meshName, side })
    }
  }, [gameMode, selectedPiece])

  const handleClosePanel = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    
    setIsClosing(true)
    closeTimeoutRef.current = window.setTimeout(() => {
      setSelectedPiece(null)
      setDisplayedPiece(null)
      setIsClosing(false)
    }, 250)
  }, [])

  const handlePieceHover = useCallback((meshName: string | null) => {
    setHoveredPiece(meshName)
  }, [])
  
  // Handle clicking outside (on the canvas background)
  const handleCanvasClick = useCallback(() => {
    // Only handle background clicks in demo mode
    if (gameMode === 'demo' && selectedPiece && !isClosing) {
      handleClosePanel()
    }
  }, [gameMode, selectedPiece, isClosing, handleClosePanel])

  // Helper to update game record when game ends
  const updateRecordForGameEnd = useCallback((newGameState: GameState, currentPlayerColor: Color) => {
    if (gameEndedRef.current) return
    
    if (newGameState.isCheckmate) {
      gameEndedRef.current = true
      const isPlayerWin = newGameState.currentTurn !== currentPlayerColor
      
      setGameRecord(prev => {
        const updated = {
          ...prev,
          wins: prev.wins + (isPlayerWin ? 1 : 0),
          losses: prev.losses + (isPlayerWin ? 0 : 1),
        }
        saveGameRecord(updated)
        return updated
      })
    } else if (newGameState.isStalemate) {
      gameEndedRef.current = true
      
      setGameRecord(prev => {
        const updated = { ...prev, draws: prev.draws + 1 }
        saveGameRecord(updated)
        return updated
      })
    }
  }, [])

  // Handle square clicks in play mode
  const handleSquareClick = useCallback((position: Position) => {
    if (!gameState || gameMode !== 'play' || isMoveInProgress || isAIThinking) return
    
    // Don't allow interaction if game is over
    if (gameState.isCheckmate || gameState.isStalemate) return
    
    // Only allow interaction on player's turn
    if (gameState.currentTurn !== playerColor) return

    const clickedPiece = getPieceAt(gameState.board, position)
    
    // Case 1: Clicking on player's piece - select it
    if (clickedPiece && clickedPiece.color === playerColor) {
      // If clicking the same piece, deselect
      if (selectedSquare && 
          selectedSquare.row === position.row && 
          selectedSquare.col === position.col) {
        setSelectedSquare(null)
        setValidMoves([])
        return
      }
      
      // Select new piece and calculate valid moves
      setSelectedSquare(position)
      const moves = getValidMoves(gameState, position)
      setValidMoves(moves)
      
      // Debug: Log why piece might not have moves
      if (moves.length === 0) {
        const piece = getPieceAt(gameState.board, position)
        console.log(`[Chess Debug] ${piece?.type} at ${positionToSquare(position)} has no valid moves.`)
        console.log(`[Chess Debug] King in check: ${gameState.isCheck}`)
        console.log(`[Chess Debug] Current turn: ${gameState.currentTurn}`)
      }
      
      return
    }
    
    // Case 2: Clicking on valid move destination - EXECUTE MOVE
    if (selectedSquare && validMoves.some(m => m.row === position.row && m.col === position.col)) {
      // Start move execution
      setIsMoveInProgress(true)
      
      // Clear selection immediately for visual feedback
      const from = selectedSquare
      const to = position
      setSelectedSquare(null)
      setValidMoves([])
      
      // Execute the move - new game state will trigger animation in Scene
      try {
        const newGameState = makeMove(gameState, from, to)
        
        // If next turn is AI's turn, show "AI thinking..." immediately
        // (unless game is over)
        if (playerColor && newGameState.currentTurn !== playerColor && !newGameState.isCheckmate && !newGameState.isStalemate) {
          setIsAIThinking(true)
        }
        
        setGameState(newGameState)
        
        // Update record if game ended
        if (playerColor) {
          updateRecordForGameEnd(newGameState, playerColor)
        }
      } catch (error) {
        console.error('Move execution failed:', error)
        setIsMoveInProgress(false)
        setIsAIThinking(false)
      }
      return
    }
    
    // Case 3: Clicking elsewhere - deselect
    setSelectedSquare(null)
    setValidMoves([])
  }, [gameState, gameMode, playerColor, selectedSquare, validMoves, isMoveInProgress, isAIThinking, updateRecordForGameEnd])

  // Handle animation complete callback from Scene
  const handleMoveAnimationComplete = useCallback(async () => {
    setIsMoveInProgress(false)
    
    // Check if game is over
    if (gameState?.isCheckmate || gameState?.isStalemate) {
      // Game over - don't trigger AI
      setIsAIThinking(false)
      return
    }
    
    // Check if it's AI's turn (current turn !== player color)
    // Note: isAIThinking is already set to true when player executed their move
    // and set to false immediately when AI selects its move
    // Note: isAIThinking is already set to true when player executed their move
    if (gameState && playerColor && gameState.currentTurn !== playerColor) {
      // It's AI's turn - calculate and make move
      if (!stockfishRef.current?.ready) {
        console.error('Stockfish not ready')
        setIsAIThinking(false)
        return
      }
      
      try {
        // Minimum delay so user sees "AI thinking..." (500ms min)
        const startTime = Date.now()
        const fen = gameStateToFen(gameState)
        const aiMove = await stockfishRef.current.calculateMove(fen)
        
        // Ensure minimum display time for "AI thinking..."
        const elapsed = Date.now() - startTime
        const minDisplayTime = 500
        if (elapsed < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed))
        }
        
        if (aiMove) {
          // Execute AI move - show "Your turn" immediately
          setIsMoveInProgress(true)
          setIsAIThinking(false) // Show "Your turn" as soon as AI selects move
          const newGameState = makeMove(gameState, aiMove.from, aiMove.to)
          setGameState(newGameState)
          
          // Update record if game ended
          updateRecordForGameEnd(newGameState, playerColor)
        } else {
          setIsAIThinking(false)
        }
      } catch (error) {
        console.error('AI move calculation failed:', error)
        setIsAIThinking(false)
      }
    }
  }, [gameState, playerColor, updateRecordForGameEnd])

  return (
    <div className="app-container">
      <Canvas 
        camera={{ 
          position: [0, 0.35, 0.6], 
          fov: 45,
          near: 0.01,
          far: 100
        }}
        shadows
        onPointerMissed={handleCanvasClick}
      >
        <Suspense fallback={null}>
          {/* Animated starfield background */}
          <AnimatedBackground />
          <AmbientParticles />
          
          <Scene 
            onPieceClick={handlePieceClick}
            onPieceHover={handlePieceHover}
            onBoardClick={handleCanvasClick}
            selectedPiece={selectedPiece?.meshName ?? null}
            hoveredPiece={hoveredPiece}
            gameMode={gameMode}
            playerColor={playerColor}
            gameState={gameState}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            onSquareClick={handleSquareClick}
            onMoveAnimationComplete={handleMoveAnimationComplete}
          />
          
          {/* Post-processing effects - vignette only for performance */}
          <Effects />
        </Suspense>
      </Canvas>
      
      <Loader />
      
      {/* Title overlay with integrated play button - only show in demo mode */}
      <TitleOverlay 
        hidden={gameMode === 'play' || displayedPiece !== null} 
        onPlayClick={handlePlayButtonClick}
        showPlayButton={gameMode === 'demo' && !isAboutOpen}
      />
      
      {/* Game controls - only show in play mode */}
      <GameControls 
        onExitToDemo={handleExitToDemo}
        onResetBoard={handleResetBoard}
        hidden={gameMode === 'demo'} 
      />
      
      {/* Turn indicator - show in play mode */}
      <TurnIndicator
        isPlayerTurn={gameState?.currentTurn === playerColor}
        isAIThinking={isAIThinking}
        isGameOver={gameState?.isCheckmate || gameState?.isStalemate || false}
        isPlayerLoss={gameState?.isCheckmate && gameState.currentTurn === playerColor}
        gameOverMessage={
          gameState?.isCheckmate 
            ? (gameState.currentTurn === playerColor ? 'Checkmate!' : 'Checkmate! You win!')
            : gameState?.isStalemate 
              ? 'Stalemate! Draw!'
              : undefined
        }
        record={gameRecord}
        hidden={gameMode === 'demo'}
      />
      
      {/* About button - show in demo mode */}
      <AboutButton 
        onClick={() => setIsAboutOpen(true)} 
        hidden={gameMode === 'play' || displayedPiece !== null || isAboutOpen} 
      />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      
      {/* Side selection modal - show when entering play mode */}
      <SideSelectionModal 
        isOpen={isSideSelectionOpen} 
        onSelect={handleSideSelection}
        onClose={handleCloseSideSelection}
      />
      
      {/* Info panel - only show in demo mode */}
      {gameMode === 'demo' && displayedPiece && (
        <InfoPanel
          piece={pieceData[displayedPiece.type]}
          pieceType={displayedPiece.type}
          color={displayedPiece.color}
          side={displayedPiece.side}
          onClose={handleClosePanel}
          isClosing={isClosing}
        />
      )}
    </div>
  )
}

export default App
