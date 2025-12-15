import { Suspense, useState, useCallback, useRef } from 'react'
import { AboutModal, AboutButton } from './components/AboutModal'
import { SideSelectionModal } from './components/SideSelectionModal'
import { ExitPlayButton } from './components/ExitPlayButton'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { InfoPanel } from './components/InfoPanel'
import { Loader } from './components/Loader'
import { TitleOverlay } from './components/TitleOverlay'
import { Effects } from './components/Effects'
import { AnimatedBackground, AmbientParticles } from './components/AnimatedBackground'
import { pieceData, type PieceType } from './data/pieceData'
import type { Color, GameState, Position } from './game/types'
import { initializeGameState, getValidMoves, getPieceAt, positionToSquare } from './game/chessEngine'
import './App.css'

type GameMode = 'demo' | 'play'

interface SelectedPiece {
  type: PieceType
  color: 'white' | 'black'
  meshName: string
  side: 'left' | 'right'
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
  
  // Demo mode state
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null)
  const [displayedPiece, setDisplayedPiece] = useState<SelectedPiece | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)

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
  }, [])

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
    // Only handle hover in demo mode
    if (gameMode !== 'demo') {
      return
    }
    setHoveredPiece(meshName)
  }, [gameMode])
  
  // Handle clicking outside (on the canvas background)
  const handleCanvasClick = useCallback(() => {
    // Only handle background clicks in demo mode
    if (gameMode === 'demo' && selectedPiece && !isClosing) {
      handleClosePanel()
    }
  }, [gameMode, selectedPiece, isClosing, handleClosePanel])

  // Handle square clicks in play mode
  const handleSquareClick = useCallback((position: Position) => {
    if (!gameState || gameMode !== 'play' || !playerColor) return

    const clickedPiece = getPieceAt(gameState.board, position)
    
    // Case 1: Clicking on own piece - select it
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
      return
    }
    
    // Case 2: Clicking on valid move destination
    if (selectedSquare && validMoves.some(m => m.row === position.row && m.col === position.col)) {
      // This is a valid move - will be executed in Feature 6
      console.log(`Move: ${positionToSquare(selectedSquare)} → ${positionToSquare(position)}`)
      // For now, just deselect (move execution comes in Feature 6)
      setSelectedSquare(null)
      setValidMoves([])
      return
    }
    
    // Case 3: Clicking elsewhere - deselect
    setSelectedSquare(null)
    setValidMoves([])
  }, [gameState, gameMode, playerColor, selectedSquare, validMoves])

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
      
      {/* Exit button - only show in play mode */}
      <ExitPlayButton 
        onClick={handleExitToDemo} 
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
