# Make Chess Board Playable

## Architecture Overview

The game will have two modes:

1. **Demo Mode** (current): Click pieces to learn about them, auto-rotating board
2. **Play Mode**: Fixed camera, click-to-move gameplay, AI opponent

## Implementation Plan

### 1. Game State Management (`src/game/chessEngine.ts`)

Create a chess engine module with:

- Board representation (8x8 array with piece objects)
- Move validation logic (all piece types, including special moves)
- Check/checkmate detection
- Castling, en passant, pawn promotion rules
- Move history and game state tracking

**Key functions:**

- `initializeBoard()` - Set up starting position
- `isValidMove(from, to, board)` - Validate any move
- `isInCheck(color, board)` - Check detection
- `isCheckmate(color, board)` - Checkmate detection
- `makeMove(from, to, board)` - Execute move and return new board state
- `getValidMoves(square, board)` - Get all legal moves for a piece

### 2. AI Integration (`src/game/ai.ts`)

Use `stockfish.js` (WebAssembly chess engine) configured for **maximum strength**:

- Install: `bun add stockfish.js`
- Create AI service that:
  - Initializes Stockfish with maximum strength settings:
    - `setoption name Skill Level value 20` (maximum)
    - `setoption name UCI_LimitStrength value false` (don't limit strength)
    - `setoption name MultiPV value 1` (single best line)
    - High depth/time limits for maximum calculation
  - Receives current board state in FEN notation
  - Calculates best move using Stockfish with deep analysis
  - Returns move in format `{ from: 'e2', to: 'e4' }`
  - Handles async move calculation with "AI thinking..." indicator
  - **Goal**: Unbeatable, god-tier AI that plays at maximum engine strength

### 3. Game Mode Toggle (`src/App.tsx`)

Add game state:

- `gameMode: 'demo' | 'play'` - Current mode
- `playerColor: 'white' | 'black'` - Which side user plays
- `gameState` - Current board, turn, status
- `selectedSquare: string | null` - Currently selected square for move
- `validMoves: string[]` - Highlighted squares for valid moves

**UI Changes:**

- Add "Play" button overlay (replaces title when clicked)
- Side selection modal: "Play as White" or "Play as Black"
- Game status bar (shows turn, check status, game over)

### 4. Camera & Controls (`src/components/Scene.tsx`)

**Camera Locking:**

- When `gameMode === 'play'`:
  - Disable auto-rotate
  - Lock OrbitControls to fixed angle based on `playerColor`
  - White side: Camera at `[0, 0.35, 0.6]` (current)
  - Black side: Rotate 180° around Y-axis, adjust camera position
  - Disable zoom/pan during gameplay (or limit severely)

**Click Handling:**

- In play mode, clicks work differently:
  - First click on piece: Select it, show valid moves
  - Second click on valid square: Execute move
  - Click elsewhere: Deselect
  - Click opponent piece: Invalid (show feedback)

### 5. Visual Feedback (`src/components/Scene.tsx`)

**Move Indicators:**

- Selected piece: Green glow (already exists)
- Valid move squares: Add glowing circles or highlights on board
- Last move: Highlight both squares with different color
- Check indicator: Subtle red glow around king

**Piece Movement:**

- Animate piece from source to destination square
- Use `@react-spring/three` for smooth interpolation
- Remove captured pieces with fade-out animation

### 6. Board Square Mapping (`src/game/boardMapping.ts`)

Create bidirectional mapping between 3D world coordinates and chess notation.

**Coordinate System** (camera at positive Z, looking toward negative Z):
- X-axis: Files (negative X = a-file, positive X = h-file)
- Z-axis: Ranks (negative Z = rank 1/white, positive Z = rank 8/black)
- Y-axis: Height above board

**Constants:**
- `SQUARE_SIZE = 0.0578880906` - Spacing between adjacent squares
- `PIECE_Y_OFFSET = 0.0174` - Height of pieces above board

**Functions:**

- `squareToWorldPosition(square: string)` - Convert "e4" to {x, y, z}
- `worldPositionToSquare(x, z)` - Convert 3D position to square notation
- `positionToWorldPosition(pos)` - Convert Position (row, col) to {x, y, z}
- `worldPositionToPosition(x, z)` - Convert 3D position to Position
- `getMeshInitialSquare(meshName)` - Get initial square for a piece mesh
- `parseMeshName(meshName)` - Extract type, color, index from mesh name

**Note:** `getPieceAtSquare` is implemented in Feature 5 (Move Selection) where
Scene.tsx has access to the 3D mesh objects.

### 7. Game UI Components

**`src/components/GameControls.tsx`:**

- Game status display (turn, check, checkmate)
- "New Game" button
- "Exit to Demo" button
- Move history (optional, collapsible)

**`src/components/MoveIndicator.tsx`:**

- 3D component that renders glowing circles on valid move squares
- Uses `@react-three/drei` Circle or custom geometry

### 8. State Flow

```
User clicks "Play" 
  → Select side (white/black)
  → Initialize game state
  → Lock camera to chosen side
  → Enable move selection

User clicks piece
  → Validate it's their turn and their piece
  → Calculate valid moves
  → Show move indicators
  → Wait for destination click

User clicks destination
  → Validate move
  → Execute move (animate piece)
  → Update board state
  → Check for check/checkmate
  → If game continues, trigger AI move
  → AI calculates and makes move
  → Return to user turn
```

### 9. File Structure

```
src/
  game/
    chessEngine.ts       # Core chess logic
    ai.ts               # Stockfish integration
    boardMapping.ts     # 3D ↔ Chess notation
    types.ts            # Game state types
  components/
    GameControls.tsx    # Game UI overlay
    MoveIndicator.tsx    # Valid move visuals
    Scene.tsx           # Modified for gameplay
    App.tsx             # Game mode state
```

### 10. Preserve Demo Mode

- Keep existing piece info modal functionality
- Toggle between modes seamlessly
- When exiting play mode, restore auto-rotation
- Demo mode remains unchanged

## Technical Considerations

- **AI Strength**: Stockfish configured for maximum strength (Skill Level 20, unlimited) - essentially unbeatable for human players
- **Performance**: AI moves are async - show "AI thinking..." indicator during calculation
- **Animation**: Use `@react-spring/three` for piece movement (already installed)
- **State Management**: Keep game state in React state, not external store (simple enough)
- **Move Validation**: Must be fast - cache valid moves when possible
- **Board Updates**: Update piece positions in 3D scene when moves execute
- **Stockfish Config**: Use high depth/time limits to ensure maximum strength calculations

## Dependencies to Add

- `stockfish.js` - Chess engine for AI (maximum strength configuration)

## Feature Breakdown (Incremental Development)

Each feature will be developed as: **Branch → Implement → PR → Code Review → Merge**

### Feature 1: Game State & Chess Engine

**Branch:** `feature/game-state-engine`

- Create `src/game/types.ts` - Game state types
- Create `src/game/chessEngine.ts` - Core chess logic
- Board representation, move validation, check/checkmate detection
- All special moves (castling, en passant, promotion)
- **No UI changes** - pure logic, testable independently

### Feature 2: Board Square Mapping ✅ **COMPLETED**

**Branch:** `feature/board-mapping` ✅ **MERGED**

- ✅ Create `src/game/boardMapping.ts` - 3D ↔ Chess notation conversion
- ✅ Bidirectional mapping: `squareToWorldPosition`, `worldPositionToSquare`
- ✅ Mesh name parsing: `getMeshInitialSquare`, `parseMeshName`
- ✅ Verified against actual GLTF model positions
- ✅ Comprehensive unit tests (29 tests)
- **Depends on:** Feature 1 (needs piece types)

### Feature 3: Game Mode Toggle & Side Selection ✅ **COMPLETED**

**Branch:** `feature/game-mode-toggle` ✅ **MERGED**

- ✅ Add game mode state to `App.tsx` (`demo` | `play`)
- ✅ Create "Play" button overlay component
- ✅ Create side selection modal (White/Black)
- ✅ Toggle between demo and play modes
- **No gameplay yet** - just mode switching

**📋 Detailed Plan:** See `tasks/FEATURE_3_GAME_MODE_TOGGLE.md` for complete implementation details

### Feature 4: Camera Locking for Play Mode ✅ **COMPLETED**

**Branch:** `feature/camera-locking` ✅ **MERGED**

- ✅ Modify `Scene.tsx` to lock camera in play mode
- ✅ Disable auto-rotate when `gameMode === 'play'`
- ✅ Lock OrbitControls based on `playerColor`
- ✅ Camera positions for white/black sides
- ✅ Smooth 800ms camera animation with ease-out
- **Depends on:** Feature 3 (needs game mode state)

### Feature 5: Move Selection & Visual Feedback ✅ **COMPLETED**

**Branch:** `feature/move-selection` ✅ **MERGED**

- ✅ Removed description text from side selection modal buttons
- ✅ Modified click handling in `Scene.tsx` for play mode
- ✅ Select pieces (validate it's player's turn and piece)
- ✅ Calculate and display valid moves
- ✅ Created `MoveIndicator.tsx` component for valid move highlights
- ✅ Show selected piece glow (reuse existing highlight)
- ✅ **Player always moves first** - regardless of chosen color (white or black)
- **Depends on:** Features 1, 2, 3, 4 (all complete)

**📋 Detailed Plan:** See `tasks/FEATURE_5_MOVE_SELECTION.md` for complete implementation details

### Feature 6: Move Execution & Animation 🎯 **NEXT**

**Branch:** `feature/move-execution`

- Execute moves when clicking valid destination (use existing `makeMove`)
- Animate piece movement using `useFrame` (400ms ease-out)
- Handle captured pieces (fade out 250ms)
- Add red glow for king in check
- Reset pieces correctly when exiting to demo mode
- **Depends on:** Feature 5

**📋 Detailed Plan:** See `tasks/FEATURE_6_MOVE_EXECUTION.md` for complete implementation details

**Note:** The chess engine's `makeMove` function already handles all move logic including castling, en passant, promotion, and check/checkmate detection. This feature focuses on the visual animation layer.

### Feature 7: AI Integration

**Branch:** `feature/ai-integration`

- Install `stockfish.js`
- Create `src/game/ai.ts` - Stockfish service
- Configure for maximum strength (unbeatable)
- Integrate AI move calculation
- Show "AI thinking..." indicator
- Execute AI moves with animation
- **Depends on:** Feature 6

### Feature 8: Game UI & Controls

**Branch:** `feature/game-ui-controls`

- Create `GameControls.tsx` component
- Game status display (turn, check, checkmate, game over)
- "New Game" button
- "Exit to Demo" button
- Optional: Move history display
- **Depends on:** Feature 7

---

## Optional Enhancements

These features are nice-to-have and can be implemented after core gameplay is complete.

### Optional: Settings Modal with Post-Processing Control

**Branch:** `feature/settings-modal`

- Create `SettingsButton.tsx` - gear icon in top-right area
- Create `SettingsModal.tsx` - modal with slider control
- Post-processing intensity slider (0-100%):
  - 0%: No effects (best performance)
  - 50%: Vignette only
  - 100%: Full effects (vignette + chromatic aberration)
- Persist setting to localStorage
- **Effort:** ~300 lines, 30-45 min
- **Depends on:** None (can be added anytime)

---

## Development Workflow

For each feature:

1. Create branch: `git checkout -b feature/feature-name`
2. Implement feature (following plan details)
3. Test locally
4. Commit: `git commit -m "feat: feature description"`
5. Push: `git push origin feature/feature-name`
6. Create PR on GitHub
7. Code review (CodeRabbit)
8. Address feedback
9. Merge to main

## Remaining Questions

1. Show move notation (e.g., "Nf3") in UI or keep it visual-only?
2. Animate AI moves or make them instant?

