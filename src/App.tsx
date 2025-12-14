import { Suspense, useState, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { InfoPanel } from './components/InfoPanel'
import { Loader } from './components/Loader'
import { pieceData, type PieceType } from './data/pieceData'
import './App.css'

interface SelectedPiece {
  type: PieceType
  color: 'white' | 'black'
  meshName: string
}

const App = () => {
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null)
  const [displayedPiece, setDisplayedPiece] = useState<SelectedPiece | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)

  const handlePieceClick = useCallback((
    pieceType: PieceType, 
    color: 'white' | 'black', 
    meshName: string
  ) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    
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
      setSelectedPiece({ type: pieceType, color, meshName })
      setDisplayedPiece({ type: pieceType, color, meshName })
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
          position: [0, 0.4, 0.65], 
          fov: 45,
          near: 0.01,
          far: 100
        }}
        shadows
        onPointerMissed={handleCanvasClick}
      >
        <Suspense fallback={null}>
          <Scene 
            onPieceClick={handlePieceClick}
            onPieceHover={handlePieceHover}
            onBoardClick={handleCanvasClick}
            selectedPiece={selectedPiece?.meshName ?? null}
            hoveredPiece={hoveredPiece}
          />
        </Suspense>
      </Canvas>
      
      <Loader />
      
      {displayedPiece && (
        <InfoPanel
          piece={pieceData[displayedPiece.type]}
          color={displayedPiece.color}
          onClose={handleClosePanel}
          isClosing={isClosing}
        />
      )}
    </div>
  )
}

export default App
