# Feature 6: Move Execution & Animation

**Branch:** `feature/move-execution`  
**PR:** #8  
**Status:** ✅ Merged

## Overview

This feature brings the chess game to life by:
1. Executing valid moves and updating the game state
2. Animating pieces smoothly between squares
3. Handling captured pieces with fade-out animations
4. Adding visual feedback for check (red king glow)
5. Allowing both sides to be played manually (AI comes in Feature 7)

## Dependencies

- ✅ Feature 1: Game State & Chess Engine (includes `makeMove`)
- ✅ Feature 2: Board Square Mapping
- ✅ Feature 3: Game Mode Toggle & Side Selection
- ✅ Feature 4: Camera Locking for Play Mode
- ✅ Feature 5: Move Selection & Visual Feedback

---

## What Already Exists (No Changes Needed)

### Chess Engine (`chessEngine.ts`)

The `makeMove` function (lines 676-807) is **already fully implemented** with:
- ✅ Move validation via `isValidMove`
- ✅ Castling (king + rook movement)
- ✅ En passant captures
- ✅ Pawn promotion (defaults to queen)
- ✅ Castling rights updates
- ✅ Check/checkmate/stalemate detection via `updateGameStatus`
- ✅ Move history tracking

**Usage:**
```typescript
import { makeMove } from './game/chessEngine'

const newGameState = makeMove(gameState, from, to)
// newGameState.isCheck, isCheckmate, isStalemate are already computed
```

### Piece Position Tracking (`Scene.tsx`)

Already implemented:
- ✅ `pieceSquares` ref - Maps mesh names to board positions
- ✅ `rebuildPieceSquares()` - Syncs meshes with board state
- ✅ `getMeshAtPosition()` - Finds mesh at a given position
- ✅ Position initialization on play mode entry

---

## Part 1: Update App.tsx to Execute Moves

### Goal
Replace the console.log in `handleSquareClick` with actual move execution.

### File: `src/App.tsx`

#### Add New Import

```typescript
import { makeMove } from './game/chessEngine'
```

#### Add State for Move In Progress

```typescript
const [isMoveInProgress, setIsMoveInProgress] = useState(false)
```

#### Update handleSquareClick

Replace Case 2 (clicking on valid move destination):

```typescript
const handleSquareClick = useCallback((position: Position) => {
  if (!gameState || gameMode !== 'play' || !playerColor || isMoveInProgress) return

  const clickedPiece = getPieceAt(gameState.board, position)
  
  // Case 1: Clicking on own piece - select it
  if (clickedPiece && clickedPiece.color === playerColor) {
    if (selectedSquare && 
        selectedSquare.row === position.row && 
        selectedSquare.col === position.col) {
      setSelectedSquare(null)
      setValidMoves([])
      return
    }
    
    setSelectedSquare(position)
    const moves = getValidMoves(gameState, position)
    setValidMoves(moves)
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
      setGameState(newGameState)
    } catch (error) {
      console.error('Move execution failed:', error)
      setIsMoveInProgress(false)
    }
    return
  }
  
  // Case 3: Clicking elsewhere - deselect
  setSelectedSquare(null)
  setValidMoves([])
}, [gameState, gameMode, playerColor, selectedSquare, validMoves, isMoveInProgress])
```

#### Add Animation Complete Handler

```typescript
const handleMoveAnimationComplete = useCallback(() => {
  setIsMoveInProgress(false)
  
  // Log game status
  if (gameState?.isCheckmate) {
    const winner = gameState.currentTurn === 'white' ? 'Black' : 'White'
    console.log(`Checkmate! ${winner} wins!`)
  } else if (gameState?.isStalemate) {
    console.log('Stalemate! Game is a draw.')
  } else if (gameState?.isCheck) {
    console.log(`${gameState.currentTurn} is in check!`)
  }
}, [gameState])
```

#### Update Scene Props

```typescript
<Scene 
  // ... existing props
  onMoveAnimationComplete={handleMoveAnimationComplete}
/>
```

---

## Part 2: Add Animation System to Scene.tsx

### Goal
Create smooth piece movement using `useFrame` for animations.

### File: `src/components/Scene.tsx`

#### New Imports

```typescript
import { useFrame } from '@react-three/fiber'
import { Mesh, Material } from 'three'
```

Note: `useFrame` is already imported from `@react-three/fiber`.

#### New Props Interface

Add to existing `SceneProps`:

```typescript
interface SceneProps {
  // ... existing props
  onMoveAnimationComplete?: () => void
}
```

#### New Refs for Animation

```typescript
// Track active piece animations
const activeAnimations = useRef<Map<string, {
  mesh: Object3D
  startPos: Vector3
  endPos: Vector3
  startTime: number
  duration: number
  onComplete: () => void
}>>(new Map())

// Track captured pieces (to hide them after fade)
const capturedMeshes = useRef<Set<string>>(new Set())

// Track fading pieces
const fadingPieces = useRef<Map<string, {
  mesh: Object3D
  startTime: number
  duration: number
}>>(new Map())
```

#### Easing Function

```typescript
// Smooth ease-out cubic for natural deceleration
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)
```

#### Animation Loop with useFrame

```typescript
useFrame(({ clock }) => {
  const currentTime = clock.getElapsedTime()
  
  // Process piece movement animations
  activeAnimations.current.forEach((anim, meshName) => {
    const elapsed = currentTime - anim.startTime
    const progress = Math.min(elapsed / anim.duration, 1)
    const easedProgress = easeOutCubic(progress)
    
    // Interpolate position
    anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, easedProgress)
    
    if (progress >= 1) {
      // Snap to final position
      anim.mesh.position.copy(anim.endPos)
      anim.onComplete()
      activeAnimations.current.delete(meshName)
    }
  })
  
  // Process fade-out animations for captured pieces
  fadingPieces.current.forEach((fade, meshName) => {
    const elapsed = currentTime - fade.startTime
    const progress = Math.min(elapsed / fade.duration, 1)
    
    // Fade opacity and sink slightly
    fade.mesh.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach(mat => {
          if (mat) {
            mat.transparent = true
            mat.opacity = 1 - progress
          }
        })
      }
    })
    
    if (progress >= 1) {
      fade.mesh.visible = false
      capturedMeshes.current.add(meshName)
      fadingPieces.current.delete(meshName)
    }
  })
})
```

#### Function: Animate Piece Movement

```typescript
const animatePieceMove = useCallback((
  meshName: string,
  from: Position,
  to: Position,
  onComplete: () => void
) => {
  const mesh = pieceMeshes.get(meshName)
  if (!mesh) {
    console.warn('No mesh found for animation:', meshName)
    onComplete()
    return
  }
  
  const startPos = new Vector3(mesh.position.x, mesh.position.y, mesh.position.z)
  const endWorldPos = positionToWorldPosition(to)
  const endPos = new Vector3(endWorldPos.x, endWorldPos.y, endWorldPos.z)
  
  activeAnimations.current.set(meshName, {
    mesh,
    startPos,
    endPos,
    startTime: performance.now() / 1000,
    duration: 0.4, // 400ms for snappy feel
    onComplete: () => {
      // Update pieceSquares tracking
      pieceSquares.current.set(meshName, to)
      onComplete()
    },
  })
}, [pieceMeshes])
```

#### Function: Fade Out Captured Piece

```typescript
const fadeOutCapturedPiece = useCallback((meshName: string) => {
  const mesh = pieceMeshes.get(meshName)
  if (!mesh) return
  
  // Remove from pieceSquares tracking
  pieceSquares.current.delete(meshName)
  
  fadingPieces.current.set(meshName, {
    mesh,
    startTime: performance.now() / 1000,
    duration: 0.25, // 250ms quick fade
  })
}, [pieceMeshes])
```

---

## Part 3: Trigger Animations When Game State Changes

### Goal
Detect when a move was made and trigger the appropriate animations.

### File: `src/components/Scene.tsx`

#### Track Previous Move History Length

```typescript
const previousMoveCount = useRef<number>(0)
```

#### Detect New Moves and Trigger Animation

```typescript
// Watch for game state changes and trigger animations
useEffect(() => {
  if (!gameState || gameMode !== 'play' || !onMoveAnimationComplete) {
    previousMoveCount.current = gameState?.moveHistory.length ?? 0
    return
  }
  
  const currentMoveCount = gameState.moveHistory.length
  
  // Check if a new move was made
  if (currentMoveCount > previousMoveCount.current) {
    const lastMove = gameState.moveHistory[currentMoveCount - 1]
    const { from, to, capturedPiece, isCastling, isEnPassant } = lastMove
    
    // Find the mesh that needs to move
    // Use 'from' position to find the piece BEFORE rebuildPieceSquares runs
    const movingMeshName = getMeshAtPosition(from)
    
    if (!movingMeshName) {
      console.warn('Could not find mesh for move animation', from)
      onMoveAnimationComplete()
      previousMoveCount.current = currentMoveCount
      return
    }
    
    // Handle captures - find and fade the captured piece
    if (capturedPiece) {
      // For en passant, captured pawn is NOT at 'to' square
      let capturedPos = to
      if (isEnPassant) {
        // Captured pawn is on same row as 'from', same col as 'to'
        capturedPos = { row: from.row, col: to.col }
      }
      
      const capturedMeshName = getMeshAtPosition(capturedPos)
      if (capturedMeshName) {
        fadeOutCapturedPiece(capturedMeshName)
      }
    }
    
    // Handle castling - also animate the rook
    if (isCastling) {
      const isKingside = to.col > from.col
      const row = from.row
      const rookFromCol = isKingside ? 7 : 0
      const rookToCol = isKingside ? 5 : 3
      const rookFrom = { row, col: rookFromCol }
      const rookTo = { row, col: rookToCol }
      
      const rookMeshName = getMeshAtPosition(rookFrom)
      if (rookMeshName) {
        // Animate rook simultaneously (no callback needed)
        animatePieceMove(rookMeshName, rookFrom, rookTo, () => {})
      }
    }
    
    // Animate the main piece
    animatePieceMove(movingMeshName, from, to, () => {
      // Rebuild piece tracking after animation completes
      rebuildPieceSquares()
      onMoveAnimationComplete()
    })
  }
  
  previousMoveCount.current = currentMoveCount
}, [
  gameState,
  gameMode,
  onMoveAnimationComplete,
  getMeshAtPosition,
  animatePieceMove,
  fadeOutCapturedPiece,
  rebuildPieceSquares
])
```

**Key Insight:** The animation effect runs BEFORE `rebuildPieceSquares` syncs the mesh positions with the new board state. This means `getMeshAtPosition(from)` will still find the piece at its pre-move location.

---

## Part 4: Add Visual Feedback for Check

### Goal
Highlight the king with a red glow when in check.

### File: `src/components/Scene.tsx`

#### Add Check Detection Helper

```typescript
// Find the king mesh that's currently in check
const getKingInCheckMesh = useCallback((): string | null => {
  if (!gameState || !gameState.isCheck) return null
  
  // The king in check is the one whose turn it is
  const kingColor = gameState.currentTurn
  
  // Find king position on the board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = getPieceAt(gameState.board, { row, col })
      if (piece && piece.type === 'king' && piece.color === kingColor) {
        return getMeshAtPosition({ row, col })
      }
    }
  }
  
  return null
}, [gameState, getMeshAtPosition])
```

#### Update Highlight Logic

Replace the existing highlight effect with priority-based logic:

```typescript
// Update highlights with check detection
useEffect(() => {
  // In play mode, prioritize check highlight
  if (gameMode === 'play') {
    const kingInCheckMesh = getKingInCheckMesh()
    
    if (kingInCheckMesh && !selectedSquare) {
      // Show red glow on king when in check (and nothing selected)
      setHighlight(kingInCheckMesh, new ThreeColor(0xff4444))
    } else if (selectedSquare) {
      // Show green glow on selected piece
      const meshName = getMeshAtPosition(selectedSquare)
      if (meshName) {
        setHighlight(meshName, new ThreeColor(0x00ff00))
      }
    } else {
      setHighlight(null, null)
    }
  } else if (selectedPiece) {
    // Demo mode: selected piece
    setHighlight(selectedPiece, new ThreeColor(0x00ff00))
  } else if (hoveredPiece) {
    // Demo mode: hovered piece
    setHighlight(hoveredPiece, new ThreeColor(0x00aaff))
  } else {
    setHighlight(null, null)
  }
}, [
  selectedPiece,
  hoveredPiece,
  selectedSquare,
  gameMode,
  getKingInCheckMesh,
  getMeshAtPosition,
  setHighlight
])
```

**Note:** When a piece is selected, we prioritize showing the selection highlight over the check highlight. The move indicators already show the player needs to resolve the check.

---

## Part 5: Handle Pawn Promotion Visually

### Goal
When a pawn promotes, update the 3D mesh to look like a queen.

### Approach Options

**Option A: Swap mesh visibility (Recommended)**
Hide the pawn mesh and show a captured queen mesh (if available) at that position.

**Option B: Accept visual mismatch temporarily**
The pawn mesh stays, but the game logic treats it as a queen. This is acceptable for MVP since:
- Promotions are rare
- It still functions correctly
- Full mesh swapping can be added in Feature 8

### Implementation (Option B - MVP)

The current implementation auto-promotes to queen. The pawn mesh will visually remain a pawn, but:
- The game state correctly shows it as a queen
- Move indicators will show queen-valid moves
- This is acceptable for initial release

**Future Enhancement (Feature 8):**
- Add promotion choice UI (Queen, Rook, Bishop, Knight)
- Implement mesh swapping for visual consistency

---

## Part 6: Reset Animations on Exit to Demo

### Goal
Ensure all pieces are visible and in correct positions when exiting play mode.

### File: `src/components/Scene.tsx`

```typescript
// Reset piece visibility when exiting play mode
useEffect(() => {
  if (gameMode === 'demo') {
    // Clear any active animations
    activeAnimations.current.clear()
    fadingPieces.current.clear()
    
    // Make all captured pieces visible again
    capturedMeshes.current.forEach(meshName => {
      const mesh = pieceMeshes.get(meshName)
      if (mesh) {
        mesh.visible = true
        // Reset opacity on all materials
        mesh.traverse((child) => {
          if ((child as Mesh).isMesh) {
            const m = child as Mesh
            const materials = Array.isArray(m.material) ? m.material : [m.material]
            materials.forEach(mat => {
              if (mat) mat.opacity = 1
            })
          }
        })
      }
    })
    capturedMeshes.current.clear()
    
    // Reset piece positions to initial squares
    pieceMeshes.forEach((mesh, meshName) => {
      const initialSquare = getMeshInitialSquare(meshName)
      if (initialSquare) {
        const pos = squareToPosition(initialSquare)
        const worldPos = positionToWorldPosition(pos)
        mesh.position.set(worldPos.x, worldPos.y, worldPos.z)
      }
    })
    
    // Clear tracking
    pieceSquares.current.clear()
    previousMoveCount.current = 0
  }
}, [gameMode, pieceMeshes])
```

---

## Testing Checklist

### Basic Move Execution
- [ ] Click piece, click valid destination → piece animates smoothly to target
- [ ] Animation duration feels natural (~400ms)
- [ ] Can't click pieces during animation (isMoveInProgress blocks input)
- [ ] After animation, can immediately make another move

### Captures
- [ ] Capture move → captured piece fades out (250ms)
- [ ] Moving piece animates to destination
- [ ] Captured piece disappears completely

### Special Moves
- [ ] **Castling kingside** → both king and rook animate simultaneously
- [ ] **Castling queenside** → both king and rook animate simultaneously
- [ ] **En passant** → captured pawn (on different square) fades out correctly
- [ ] **Pawn promotion** → pawn reaches last rank, becomes queen in game state

### Check/Checkmate Detection
- [ ] Put opponent in check → console logs "X is in check!"
- [ ] King in check → red glow on king (when nothing selected)
- [ ] Checkmate → console logs "Checkmate! X wins!"
- [ ] Stalemate → console logs "Stalemate! Game is a draw."

### Game Flow
- [ ] Can play full game manually (moving both sides)
- [ ] Turn alternates correctly after each move
- [ ] Valid moves update correctly for each piece selection

### Mode Transitions
- [ ] Exit to demo → all pieces reset to starting positions
- [ ] Exit to demo → captured pieces become visible again
- [ ] Re-enter play mode → fresh game state, all pieces correct
- [ ] Demo mode auto-rotate still works after returning from play

---

## Estimated Effort (Revised)

| Part | Description | Lines | Time |
|------|-------------|-------|------|
| Part 1 | App.tsx: Execute moves + state | ~35 | 15 min |
| Part 2 | Scene.tsx: Animation system | ~80 | 30 min |
| Part 3 | Scene.tsx: Trigger animations | ~50 | 20 min |
| Part 4 | Scene.tsx: Check highlighting | ~25 | 10 min |
| Part 5 | Pawn promotion (MVP) | ~5 | 5 min |
| Part 6 | Reset on exit to demo | ~30 | 10 min |

**Total:** ~225 lines, ~1.5 hours

*Note: Original estimate was ~450 lines, 2.5 hours. Reduced because `makeMove` already exists in the engine.*

---

## Technical Notes

### Animation Timing
- **Piece move:** 400ms with ease-out cubic
- **Capture fade:** 250ms linear
- **Castling:** King + rook animate simultaneously (400ms)

### Why useFrame Instead of React Spring?
- More control over animation timing and sequencing
- Easier to coordinate multiple simultaneous animations (castling)
- No additional dependencies needed (`useFrame` already from `@react-three/fiber`)

### Move Detection Strategy
The animation effect watches `gameState.moveHistory.length`. When it increases:
1. Extract the last move from history
2. Find the mesh at the `from` position (before rebuildPieceSquares runs)
3. Trigger animation to `to` position
4. Handle captures/castling based on move flags
5. Call `rebuildPieceSquares` after animation completes

### Testing Without AI
For this feature, the player can manually make moves for both white and black. This allows:
- Full testing of all move types
- Verification of animation system
- Testing of check/checkmate detection
- No dependency on AI integration

---

## Known Limitations (Acceptable for MVP)

1. **Pawn promotion:** Auto-promotes to queen (visual mismatch - pawn mesh, queen behavior)
2. **No move undo:** Can't take back moves
3. **No move history UI:** Moves only logged to console
4. **Manual both sides:** Must move pieces for both colors

*All limitations will be addressed in Features 7 (AI) and 8 (Game UI).*

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `isMoveInProgress`, update `handleSquareClick` to call `makeMove`, add `handleMoveAnimationComplete` |
| `src/components/Scene.tsx` | Add animation refs, `useFrame` loop, animation functions, check highlighting, demo reset logic |

No changes needed to `chessEngine.ts` - `makeMove` already handles everything!


