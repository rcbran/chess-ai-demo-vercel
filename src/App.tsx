import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { AboutModal, AboutButton } from './components/AboutModal'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { InfoPanel } from './components/InfoPanel'
import { Loader } from './components/Loader'
import { TitleOverlay } from './components/TitleOverlay'
import { Effects } from './components/Effects'
import { AnimatedBackground, AmbientParticles } from './components/AnimatedBackground'
import { pieceData, type PieceType } from './data/pieceData'
import type { Color } from './game/types'
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
  // playerColor determines camera angle in play mode (default to white)
  const [playerColor, setPlayerColor] = useState<Color | null>(null)
  
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
    // Default to white for now (side selection can be added later)
    setPlayerColor('white')
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

  // Handle Escape key to exit play mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameMode === 'play') {
        setGameMode('demo')
        setPlayerColor(null)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameMode])

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
          />
          
          {/* Post-processing effects */}
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
      
      {/* About button - show in demo mode */}
      <AboutButton 
        onClick={() => setIsAboutOpen(true)} 
        hidden={gameMode === 'play' || displayedPiece !== null || isAboutOpen} 
      />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      
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
