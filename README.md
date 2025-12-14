# 3D Interactive Chess Demo

An interactive 3D chess set built with React and Three.js. Click on any chess piece to learn about its movement rules, value, and special abilities.

![Chess Demo](https://img.shields.io/badge/React-19-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.182-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## Features

- **3D Chess Set** - Beautiful 4K textured chess pieces and board rendered in real-time 3D
- **Auto-Rotating Camera** - Smooth orbiting camera that showcases the chess set
- **Interactive Pieces** - Hover over pieces to highlight them, click to learn more
- **Piece Information Panel** - Glassmorphic UI panel showing:
  - Piece name and color
  - Movement rules
  - Special abilities (castling, en passant, promotion)
  - Visual movement pattern grid
  - Point value
- **Smooth Animations** - Panel slide-in/out, hover slowdown, material highlighting
- **Loading Screen** - Progress indicator while the 3D model loads

## Tech Stack

- **React 19** - UI framework
- **Three.js** - 3D rendering engine
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers for R3F (OrbitControls, useGLTF, useProgress)
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
│   ├── Scene.tsx      # 3D scene with chess model, lighting, controls
│   ├── InfoPanel.tsx  # Piece information overlay
│   ├── InfoPanel.css  # Glassmorphic panel styling
│   ├── Loader.tsx     # Loading spinner with progress
│   └── Loader.css     # Loader styling
├── data/
│   └── pieceData.ts   # Chess piece definitions (names, rules, patterns)
├── App.tsx            # Main app with Canvas and state management
├── App.css            # Full-screen black background
├── index.css          # CSS reset
└── main.tsx           # App entry point

public/
└── models/
    └── chess_set_4k.glb  # 3D chess model with textures
```

## Controls

| Action | Result |
|--------|--------|
| **Hover** piece | Blue highlight, rotation slows |
| **Click** piece | Opens info panel, rotation stops |
| **Click** board/empty | Closes info panel |
| **Press** Escape | Closes info panel |
| **Drag** | Rotate camera manually |
| **Scroll** | Zoom in/out |
| **Right-drag** | Pan camera |

## Customization

### Adjusting Camera

In `Scene.tsx`, modify the `OrbitControls` props:
```tsx
<OrbitControls 
  autoRotate
  autoRotateSpeed={0.5}  // Rotation speed
/>
```

In `App.tsx`, modify the initial camera position:
```tsx
camera={{ 
  position: [0, 0.4, 0.65],  // [x, y, z]
  fov: 45,
}}
```

### Changing Highlight Colors

In `Scene.tsx`, modify the colors in the `useEffect`:
```tsx
setHighlight(selectedPiece, new Color(0x00ff00))  // Selected: green
setHighlight(hoveredPiece, new Color(0x00aaff))   // Hover: blue
```

### Updating Piece Information

Edit `src/data/pieceData.ts` to modify piece descriptions, rules, or movement patterns.

## License

MIT

## Credits

- Chess model: [Poly Haven](https://polyhaven.com/) / Blender export
- Built with AI assistance for a lunch-and-learn demo on AI-assisted development
