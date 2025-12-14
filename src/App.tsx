import { Suspense, useState, useCallback, useRef } from 'react'
import { AboutModal, AboutButton } from './components/AboutModal'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { InfoPanel } from './components/InfoPanel'
import { Loader } from './components/Loader'
import { TitleOverlay } from './components/TitleOverlay'
import { Effects } from './components/Effects'
import { AnimatedBackground, AmbientParticles } from './components/AnimatedBackground'
import { pieceData, type PieceType } from './data/pieceData'
import './App.css'

interface SelectedPiece {
  type: PieceType
  color: 'white' | 'black'
  meshName: string
  side: 'left' | 'right'
}

const App = () => {
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null)
  const [displayedPiece, setDisplayedPiece] = useState<SelectedPiece | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)

  const handlePieceClick = useCallback((
    pieceType: PieceType, 
    color: 'white' | 'black', 
    meshName: string,
    screenX: number
  ) => {
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
  }, [selectedPiece])

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
    if (selectedPiece && !isClosing) {
      handleClosePanel()
    }
  }, [selectedPiece, isClosing, handleClosePanel])

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
          />
          
          {/* Post-processing effects */}
          <Effects />
        </Suspense>
      </Canvas>
      
      <Loader />
      <TitleOverlay hidden={displayedPiece !== null} />
      
      <AboutButton onClick={() => setIsAboutOpen(true)} hidden={displayedPiece !== null || isAboutOpen} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      
      {displayedPiece && (
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
