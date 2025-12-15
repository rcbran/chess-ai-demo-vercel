# 3D Interactive Chess Demo

An interactive 3D chess set built with React and Three.js. Play against a Stockfish AI opponent or explore pieces in demo mode to learn about their movement rules, value, and special abilities.

![Chess Demo](https://img.shields.io/badge/React-19-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.182-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## Features

- **3D Chess Set** - Beautiful 4K textured chess pieces and board rendered in real-time 3D
- **Two Game Modes**:
  - **Demo Mode** - Explore pieces, learn rules, and see movement patterns
  - **Play Mode** - Play against Stockfish AI with full chess rules
- **AI Opponent** - Stockfish 17.1 engine with configurable difficulty
- **Interactive Pieces** - Hover over pieces to highlight them, click to select and see valid moves
- **Move Execution** - Smooth 3D animations for piece movement and captures
- **Visual Feedback** - Highlights for selected pieces, valid moves, captures, and check
- **Piece Information Panel** - Glassmorphic UI panel showing:
  - Piece name and color
  - Movement rules
  - Special abilities (castling, en passant, promotion)
  - Visual movement pattern grid
  - Point value
- **Smooth Animations** - Panel slide-in/out, piece movement, hover effects, material highlighting
- **Loading Screen** - Progress indicator while the 3D model loads

## Tech Stack

- **React 19** - UI framework
- **Three.js** - 3D rendering engine
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers for R3F (OrbitControls, useGLTF, useProgress)
- **Stockfish.js** - WebAssembly chess engine for AI opponent
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- Bun (recommended) or npm/yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd chess-ai-demo

# Install dependencies
bun install
# or
npm install

# Start the development server
bun run dev
# or
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
bun run build
# or
npm run build
```

## How It Works

### 3D Model Loading

The chess set is a GLTF/GLB model loaded using `useGLTF` from `@react-three/drei`. The model contains:
- Individual named meshes for each piece (e.g., `piece_king_white`, `piece_pawn_black_01`)
- A board mesh named `board`
- PBR materials with diffuse, normal, and roughness textures

### Piece Detection

When the model loads, we traverse the scene graph and build a map of all piece meshes by name. The naming convention `piece_[type]_[color]_[number]` allows us to extract:
- **Piece type**: king, queen, rook, bishop, knight, pawn
- **Color**: white or black

### Hover & Selection

- **Hover**: When hovering over a piece, we replace its material with a highlighted version (blue emissive glow)
- **Selection**: When clicked, the material gets a green emissive glow
- **Camera**: Auto-rotation pauses on selection, slows down on hover

### Material Highlighting

Three.js materials are cloned and modified to add emissive properties for the glow effect. The original materials are stored and restored when unhighlighting.

## Project Structure

```
src/
├── components/
│   ├── Scene.tsx              # 3D scene with chess model, lighting, controls
│   ├── InfoPanel.tsx          # Piece information overlay (demo mode)
│   ├── TitleOverlay.tsx       # Title and play button
│   ├── SideSelectionModal.tsx # White/Black selection modal
│   ├── GameControls.tsx       # Back and Reset buttons (play mode)
│   ├── TurnIndicator.tsx      # "Your turn" / "Thinking..." indicator
│   ├── MoveIndicator.tsx      # Visual move/capture indicators
│   └── Loader.tsx             # Loading spinner with progress
├── game/
│   ├── chessEngine.ts         # Core chess logic (moves, validation, FEN)
│   ├── ai.ts                  # Stockfish AI wrapper
│   └── types.ts               # TypeScript types for game state
├── data/
│   └── pieceData.ts           # Chess piece definitions (names, rules, patterns)
├── App.tsx                    # Main app with Canvas and state management
├── App.css                    # Full-screen black background
├── index.css                  # CSS reset
└── main.tsx                   # App entry point

public/
└── models/
    └── chess_set_4k.gltf      # 3D chess model with textures
```

## License

MIT

## Credits

- Chess model: [Poly Haven](https://polyhaven.com/) / Blender export
- Built with AI assistance for a lunch-and-learn demo on AI-assisted development
