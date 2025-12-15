# Feature 5: Move Selection & Visual Feedback

## Overview

This feature adds the core interaction for playing chess:
1. Click a piece to select it
2. See valid moves highlighted on the board
3. Click a destination to prepare for move execution (Feature 6)

**Branch:** `feature/move-selection`

## Dependencies

- ✅ Feature 1: Game State & Chess Engine
- ✅ Feature 2: Board Square Mapping
- ✅ Feature 3: Game Mode Toggle & Side Selection
- ✅ Feature 4: Camera Locking for Play Mode

## Pre-Implementation Changes

### ✅ Update Side Selection Modal
- Removed "You move first" / "AI moves first" description text from both buttons
- Cleaner UI with just the color labels

---

## Part 1: Add Game State to App.tsx

### Goal
Initialize and manage chess game state when entering play mode.

### New State

```typescript
import { GameState, Position } from './game/types'
import { initializeGameState, getValidMoves, getPieceAt } from './game/chessEngine'

// New state
const [gameState, setGameState] = useState<GameState | null>(null)
const [selectedSquare, setSelectedSquare] = useState<Position | null>(null)
const [validMoves, setValidMoves] = useState<Position[]>([])
```

### Changes to Existing Handlers

**`handleSideSelection`:**
```typescript
const handleSideSelection = useCallback((color: Color) => {
  setPlayerColor(color)
  setIsSideSelectionOpen(false)
  
  // Initialize game state - player always moves first
  const newGameState = initializeGameState()
  // Set currentTurn to player's color so they move first
  newGameState.currentTurn = color
  setGameState(newGameState)
  
  console.log(`Game started: Player is ${color}, moving first`)
}, [])
```

**`handleExitToDemo`:**
```typescript
const handleExitToDemo = useCallback(() => {
  setGameMode('demo')
  setPlayerColor(null)
  setIsSideSelectionOpen(false)
  // Clear game state
  setGameState(null)
  setSelectedSquare(null)
  setValidMoves([])
}, [])
```

### New Handler: `handleSquareClick`

```typescript
const handleSquareClick = useCallback((position: Position, meshName: string | null) => {
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
    // This is a valid move - will be handled in Feature 6
    console.log(`Move: ${positionToSquare(selectedSquare)} → ${positionToSquare(position)}`)
    // For now, just deselect
    setSelectedSquare(null)
    setValidMoves([])
    return
  }
  
  // Case 3: Clicking elsewhere - deselect
  setSelectedSquare(null)
  setValidMoves([])
}, [gameState, gameMode, playerColor, selectedSquare, validMoves])
```

### Updated Scene Props

```typescript
<Scene 
  onPieceClick={handlePieceClick}
  onPieceHover={handlePieceHover}
  onBoardClick={handleCanvasClick}
  selectedPiece={selectedPiece?.meshName ?? null}
  hoveredPiece={hoveredPiece}
  gameMode={gameMode}
  playerColor={playerColor}
  // New props for play mode
  gameState={gameState}
  selectedSquare={selectedSquare}
  validMoves={validMoves}
  onSquareClick={handleSquareClick}
/>
```

---

## Part 2: Create MoveIndicator Component

### File: `src/components/MoveIndicator.tsx`

```typescript
import { useMemo } from 'react'
import { RingGeometry, MeshBasicMaterial, DoubleSide } from 'three'
import type { Position } from '../game/types'
import { positionToWorldPosition } from '../game/boardMapping'

interface MoveIndicatorProps {
  positions: Position[]
  isCapture?: (pos: Position) => boolean  // Optional: different style for captures
}

export const MoveIndicator = ({ positions, isCapture }: MoveIndicatorProps) => {
  // Create ring geometry for indicators
  const ringGeometry = useMemo(() => new RingGeometry(0.015, 0.025, 32), [])
  
  // Materials for regular moves and captures
  const moveMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.7,
    side: DoubleSide,
  }), [])
  
  const captureMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0xff6644,
    transparent: true,
    opacity: 0.7,
    side: DoubleSide,
  }), [])

  return (
    <>
      {positions.map((pos, index) => {
        const worldPos = positionToWorldPosition(pos)
        const material = isCapture?.(pos) ? captureMaterial : moveMaterial
        
        return (
          <mesh
            key={`move-indicator-${index}`}
            position={[worldPos.x, worldPos.y + 0.001, worldPos.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={ringGeometry}
            material={material}
          />
        )
      })}
    </>
  )
}
```

### Alternative: Dot Style Indicators

For a cleaner look, use filled circles instead of rings:

```typescript
const circleGeometry = useMemo(() => new CircleGeometry(0.012, 32), [])
```

---

## Part 3: Modify Scene.tsx Click Handling

### New Props Interface

```typescript
interface SceneProps {
  onPieceClick: (pieceType: PieceType, color: 'white' | 'black', meshName: string, screenX: number) => void
  onPieceHover: (meshName: string | null) => void
  onBoardClick: () => void
  selectedPiece: string | null
  hoveredPiece: string | null
  gameMode?: 'demo' | 'play'
  playerColor?: Color | null
  // New props
  gameState?: GameState | null
  selectedSquare?: Position | null
  validMoves?: Position[]
  onSquareClick?: (position: Position, meshName: string | null) => void
}
```

### New Imports

```typescript
import { MoveIndicator } from './MoveIndicator'
import { worldPositionToPosition, getMeshInitialSquare } from '../game/boardMapping'
import type { GameState, Position } from '../game/types'
import { getPieceAt } from '../game/chessEngine'
```

### Track Piece Positions

```typescript
// Track current positions of all pieces (mesh name → current square)
const pieceSquares = useRef<Map<string, Position>>(new Map())

// Initialize piece positions when game starts
useEffect(() => {
  if (gameMode === 'play' && gameState) {
    // At game start, pieces are at their initial positions
    pieceSquares.current.clear()
    pieceMeshes.forEach((_, meshName) => {
      const square = getMeshInitialSquare(meshName)
      if (square) {
        pieceSquares.current.set(meshName, squareToPosition(square))
      }
    })
  }
}, [gameMode, gameState, pieceMeshes])
```

### Modified Click Handler

```typescript
const handleClick = (event: { stopPropagation: () => void; object: Object3D; pointer: { x: number }; point: Vector3 }) => {
  event.stopPropagation()
  
  const clickedObject = event.object as Object3D
  
  // DEMO MODE: existing behavior
  if (gameMode === 'demo') {
    if (clickedObject.name === 'board') {
      onBoardClick()
      return
    }
    
    let target = clickedObject
    while (target && !target.name.startsWith('piece_')) {
      target = target.parent as Object3D
    }
    
    if (target && target.name.startsWith('piece_')) {
      const pieceType = getPieceTypeFromName(target.name)
      const pieceColor = getPieceColorFromName(target.name)
      
      if (pieceType && pieceColor) {
        const screenX = event.pointer.x
        onPieceClick(pieceType, pieceColor, target.name, screenX)
      }
    }
    return
  }
  
  // PLAY MODE: handle piece selection and moves
  if (gameMode === 'play' && onSquareClick) {
    // Get the clicked position in world coordinates
    const clickPoint = event.point
    const position = worldPositionToPosition(clickPoint.x, clickPoint.z)
    
    if (!position) return // Clicked outside board
    
    // Find if we clicked a piece
    let clickedMeshName: string | null = null
    let target = clickedObject
    while (target && !target.name.startsWith('piece_')) {
      target = target.parent as Object3D
    }
    if (target && target.name.startsWith('piece_')) {
      clickedMeshName = target.name
    }
    
    onSquareClick(position, clickedMeshName)
  }
}
```

### Render MoveIndicator

```typescript
return (
  <>
    {/* Lighting */}
    <ambientLight intensity={0.6} />
    {/* ... */}
    
    {/* Chess board model */}
    <primitive 
      ref={groupRef}
      object={clonedScene} 
      /* ... */
    />
    
    {/* Move indicators - only in play mode with valid moves */}
    {gameMode === 'play' && validMoves && validMoves.length > 0 && (
      <MoveIndicator 
        positions={validMoves}
        isCapture={(pos) => {
          if (!gameState) return false
          const piece = getPieceAt(gameState.board, pos)
          return piece !== null
        }}
      />
    )}
    
    {/* Camera controls */}
    <OrbitControls ref={controlsRef} /* ... */ />
  </>
)
```

### Update Highlight Logic for Play Mode

```typescript
// Get selected mesh name from selectedSquare in play mode
const getSelectedMeshForPlayMode = useCallback((): string | null => {
  if (!selectedSquare || gameMode !== 'play') return null
  
  // Find the mesh at the selected square
  for (const [meshName, pos] of pieceSquares.current.entries()) {
    if (pos.row === selectedSquare.row && pos.col === selectedSquare.col) {
      return meshName
    }
  }
  return null
}, [selectedSquare, gameMode])

// Use this in the highlight effect
useEffect(() => {
  const selectedMeshName = gameMode === 'play' 
    ? getSelectedMeshForPlayMode() 
    : selectedPiece
    
  if (selectedMeshName) {
    setHighlight(selectedMeshName, new ThreeColor(0x00ff00))
  } else if (hoveredPiece && gameMode === 'demo') {
    setHighlight(hoveredPiece, new ThreeColor(0x00aaff))
  } else {
    setHighlight(null, null)
  }
}, [selectedPiece, hoveredPiece, gameMode, getSelectedMeshForPlayMode, setHighlight])
```

---

## Part 4: CSS for Move Indicator Pulse Animation (Optional)

If using CSS-based animation, add to a shader or use React Spring:

```typescript
// Using useFrame for subtle pulse
import { useFrame } from '@react-three/fiber'

// In MoveIndicator:
const meshRefs = useRef<Mesh[]>([])

useFrame(({ clock }) => {
  const pulse = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.15
  meshRefs.current.forEach(mesh => {
    if (mesh.material instanceof MeshBasicMaterial) {
      mesh.material.opacity = pulse
    }
  })
})
```

---

## Testing Checklist

- [ ] Enter play mode → game state initializes
- [ ] Click own piece → shows green glow
- [ ] Valid moves display as indicators on board
- [ ] Capture squares show different color (red/orange)
- [ ] Click same piece → deselects
- [ ] Click different own piece → selects new piece  
- [ ] Click empty non-valid square → deselects
- [ ] Click opponent piece (not on valid move) → no selection
- [ ] Demo mode still works as before (info panel)
- [ ] Camera remains locked in play mode
- [ ] Exit to demo → clears all selection state

---

## Estimated Effort

| Part | Lines | Time |
|------|-------|------|
| Part 1: App.tsx state | ~60 | 15 min |
| Part 2: MoveIndicator | ~50 | 15 min |
| Part 3: Scene.tsx | ~100 | 30 min |
| Part 4: Animation | ~20 | 10 min |

**Total:** ~230 lines, ~70 minutes

---

## Notes

- Move execution (animating pieces, updating board) is Feature 6
- AI integration is Feature 7
- The `pieceSquares` ref will be updated in Feature 6 when moves are executed

