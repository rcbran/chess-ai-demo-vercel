# Feature 7: AI Integration

**Branch:** `feature/ai-integration`
**PR:** [#9](https://github.com/rcbran/chess-ai-demo-vercel/pull/9)
**Status:** 🔄 In Review

## Overview

Integrate Stockfish chess engine to provide an AI opponent. The AI should be configurable from easy to unbeatable, with visual feedback while "thinking."

## Dependencies

- **Package:** `stockfish` v17.1.0 (WebAssembly port)
- **Depends on:** Feature 6 (Move Execution - ✅ Merged)

## Existing Infrastructure

From `chessEngine.ts`:
- `gameStateToFen(gameState)` - Convert game state to FEN string
- `makeMove(gameState, from, to)` - Execute moves
- `Position` type with `row`, `col` properties
- `positionToSquare(position)` - Convert Position to "e4" notation

## Implementation Plan

### Part 1: Install Stockfish Package

```bash
bun add stockfish
```

**Estimated effort:** 1 minute

---

### Part 2: Create AI Service (`src/game/ai.ts`)

Create a service that wraps Stockfish with a clean async interface.

```typescript
// src/game/ai.ts

export interface AIMove {
  from: Position
  to: Position
  promotion?: 'q' | 'r' | 'b' | 'n'
}

export interface AIConfig {
  depth?: number          // Search depth (1-20+), higher = stronger
  skillLevel?: number     // 0-20, affects move quality
}

// Default: Strong but not instant (good UX balance)
const DEFAULT_CONFIG: AIConfig = {
  depth: 15,
  skillLevel: 20,
}

export class StockfishAI {
  private worker: Worker | null = null
  private isReady: boolean = false
  private pendingResolve: ((move: AIMove | null) => void) | null = null

  async initialize(): Promise<void>
  async calculateMove(fen: string, config?: AIConfig): Promise<AIMove | null>
  terminate(): void
}
```

**Key implementation details:**

1. **Web Worker:** Stockfish runs in a Web Worker to avoid blocking the main thread
2. **UCI Protocol:** Communicate via UCI commands:
   - `uci` → `uciok` (initialization)
   - `isready` → `readyok` (confirmation)
   - `position fen <FEN>` (set position)
   - `go depth <N>` or `go movetime <ms>` (calculate)
   - Parse `bestmove e2e4` response
3. **Promise-based API:** Each `calculateMove` returns a Promise
4. **Error handling:** Timeout after 30s, handle worker errors

**Estimated effort:** 80-100 lines, ~30 min

---

### Part 3: Create Turn Indicator Component

```typescript
// src/components/TurnIndicator.tsx

interface TurnIndicatorProps {
  isPlayerTurn: boolean
  isAIThinking: boolean
  isGameOver: boolean
  gameOverMessage?: string  // "Checkmate! You win!" etc.
  hidden?: boolean
}

export const TurnIndicator = ({ 
  isPlayerTurn, 
  isAIThinking, 
  isGameOver,
  gameOverMessage,
  hidden 
}: TurnIndicatorProps) => {
  if (hidden) return null
  
  const getMessage = () => {
    if (isGameOver) return gameOverMessage || 'Game Over'
    if (isAIThinking) return 'AI thinking...'
    if (isPlayerTurn) return 'Your turn'
    return ''
  }
  
  return (
    <div className={`turn-indicator ${isAIThinking ? 'thinking' : ''}`}>
      <span className="turn-text">{getMessage()}</span>
    </div>
  )
}
```

**Styling:**
- Position: Fixed, top center (below title area)
- "AI thinking..." has animated pulsing dots
- "Your turn" is static with subtle fade-in
- Game over messages with appropriate styling
- Glassmorphism style matching existing UI
- Smooth transitions between states

**Estimated effort:** 60-70 lines, ~20 min

---

### Part 4: Integrate AI into Game Flow (`src/App.tsx`)

**New state:**
```typescript
const [isAIThinking, setIsAIThinking] = useState(false)
const stockfishRef = useRef<StockfishAI | null>(null)
```

**Modified `handleMoveAnimationComplete`:**

After player's move animation completes:
1. Check if game is over (checkmate/stalemate) → if so, don't trigger AI
2. Check if it's AI's turn (current turn !== playerColor)
3. If AI's turn:
   - Set `isAIThinking = true`
   - Call `stockfish.calculateMove(fen)`
   - When move received, call `makeMove` and trigger animation
   - Set `isAIThinking = false`

**Lifecycle:**
- Initialize Stockfish when entering play mode
- Terminate Stockfish when exiting to demo mode
- Handle race conditions (user exits while AI is thinking)

**Estimated effort:** 50-70 lines of changes, ~20 min

---

### Part 5: Handle AI Move Execution

The AI move follows the same flow as player moves:
1. `calculateMove` returns `{ from, to, promotion? }`
2. Call `makeMove(gameState, from, to)` 
3. `setGameState(newGameState)` triggers animation in Scene
4. Animation completes → `handleMoveAnimationComplete` fires
5. Check if game continues → player's turn

**Edge cases:**
- AI move during checkmate (shouldn't happen, but guard)
- Promotion: Stockfish returns moves like `e7e8q` (promote to queen)
- En passant / castling: Already handled by `makeMove`

**Estimated effort:** Included in Part 4

---

### Part 6: Add AI Difficulty Settings (Optional Enhancement)

If time permits, add difficulty selection to side selection modal:

```typescript
interface DifficultyLevel {
  name: string
  config: AIConfig
}

const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { name: 'Beginner', config: { depth: 3, skillLevel: 1 } },
  { name: 'Intermediate', config: { depth: 8, skillLevel: 10 } },
  { name: 'Advanced', config: { depth: 12, skillLevel: 15 } },
  { name: 'Master', config: { depth: 18, skillLevel: 20 } },
  { name: 'Unbeatable', config: { depth: 22, skillLevel: 20 } },
]
```

**MVP approach:** Start with fixed "Master" difficulty, add settings later.

**Estimated effort:** 30-40 lines if implemented, ~15 min

---

## File Changes Summary

| File | Changes |
|------|---------|
| `package.json` | Add `stockfish` dependency |
| `src/game/ai.ts` | **NEW** - Stockfish wrapper service |
| `src/components/TurnIndicator.tsx` | **NEW** - Turn/thinking indicator UI |
| `src/components/TurnIndicator.css` | **NEW** - Indicator styles with animations |
| `src/App.tsx` | Integrate AI into game flow, add turn state |

## Testing Plan

1. **Manual testing:**
   - Play as white, verify AI responds after each move
   - Play as black, verify player still moves first (player always moves first regardless of color)
   - Test "Thinking..." indicator appears/disappears
   - Test checkmate detection stops AI
   - Test exit to demo while AI is thinking

2. **Edge cases:**
   - AI promotion (pawn to queen on 8th rank)
   - AI castling
   - AI en passant
   - Rapid clicking during AI think time

## Estimated Total Effort

| Part | Effort |
|------|--------|
| Part 1: Install package | 1 min |
| Part 2: AI service | 30 min |
| Part 3: Thinking indicator | 15 min |
| Part 4: App integration | 20 min |
| Part 5: Edge cases | 10 min |
| Part 6: Difficulty (optional) | 15 min |
| **Total** | **~1.5 hours** |

## Technical Notes

### Stockfish UCI Commands

```text
// Initialize
uci
setoption name Skill Level value 20
isready

// Calculate move
position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1
go depth 15

// Response
bestmove e7e5 ponder d2d4
```

### Parsing Best Move

```typescript
// "bestmove e2e4" or "bestmove e7e8q" (promotion)
const match = message.match(/^bestmove\s+(\w+)/)
if (match) {
  const moveStr = match[1] // "e2e4" or "e7e8q"
  const from = moveStr.slice(0, 2)
  const to = moveStr.slice(2, 4)
  const promotion = moveStr[4] as 'q' | 'r' | 'b' | 'n' | undefined
}
```

### Web Worker Setup

The `stockfish` npm package exports a factory that creates a Web Worker:

```typescript
import stockfishFactory from 'stockfish'

// Creates a web worker
const stockfish = await stockfishFactory()
stockfish.postMessage('uci')
stockfish.onmessage = (e) => console.log(e.data)
```

## Design Decisions

1. **AI move animation speed:** Same as player (400ms) ✅
2. **First move:** Player always moves first (regardless of color choice) ✅
3. **Turn indicator:** Animated text at top of screen showing "Your turn" or "Thinking..." ✅

