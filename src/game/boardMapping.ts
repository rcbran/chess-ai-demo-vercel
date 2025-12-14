/**
 * Board Mapping - 3D World ↔ Chess Notation Conversion
 *
 * This module provides bidirectional mapping between:
 * - 3D world coordinates (x, y, z) used by Three.js
 * - Chess notation (e.g., "e4", "a1") and Position objects (row, col)
 *
 * Coordinate System (camera at positive Z, looking toward negative Z):
 * - X-axis: Files (negative = file 'a', positive = file 'h')
 * - Z-axis: Ranks (negative = rank 1/white, positive = rank 8/black)
 * - Y-axis: Height above board
 *
 * From camera's perspective (behind white pieces):
 * - Left side = a-file (negative X)
 * - Right side = h-file (positive X)
 * - Near = white pieces (negative Z)
 * - Far = black pieces (positive Z)
 *
 * @module boardMapping
 */

import type { Position, SquareNotation } from './types'
import type { PieceType } from '../data/pieceData'
import type { Color } from './types'
import { squareToPosition, positionToSquare } from './chessEngine'

// =============================================================================
// CONSTANTS - Derived from GLTF model analysis
// =============================================================================

/** Size of each square in 3D world units */
export const SQUARE_SIZE = 0.0578880906

/** Half the board width (3.5 squares from center to edge) */
export const BOARD_HALF_SIZE = 3.5 * SQUARE_SIZE // ≈ 0.2026

/** Y-coordinate for pieces sitting on the board */
export const PIECE_Y_OFFSET = 0.017392655834555626

/** Board boundaries for bounds checking */
export const BOARD_MIN = -BOARD_HALF_SIZE - SQUARE_SIZE / 2
export const BOARD_MAX = BOARD_HALF_SIZE + SQUARE_SIZE / 2

// =============================================================================
// 3D WORLD POSITION TYPES
// =============================================================================

export interface WorldPosition {
  x: number
  y: number
  z: number
}

// =============================================================================
// COORDINATE CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert a board Position (row, col) to 3D world coordinates
 *
 * Coordinate system (from camera at positive Z looking toward negative Z):
 * - Positive X = right (toward h-file)
 * - Negative X = left (toward a-file)
 * - Negative Z = white side (rank 1)
 * - Positive Z = black side (rank 8)
 *
 * @param pos - Board position with row (0-7) and col (0-7)
 * @returns 3D world coordinates for the center of that square
 *
 * @example
 * positionToWorldPosition({ row: 7, col: 4 }) // e1 - white king start
 * // Returns { x: 0.0289, y: 0.0174, z: -0.2026 }
 */
export const positionToWorldPosition = (pos: Position): WorldPosition => {
  // X: col 0 (a-file) = negative, col 7 (h-file) = positive
  const x = (pos.col - 3.5) * SQUARE_SIZE
  // Z: row 0 (rank 8) = positive, row 7 (rank 1) = negative
  const z = (3.5 - pos.row) * SQUARE_SIZE
  return { x, y: PIECE_Y_OFFSET, z }
}

/**
 * Convert chess notation to 3D world coordinates
 *
 * @param square - Chess notation (e.g., "e4", "a1", "h8")
 * @returns 3D world coordinates for the center of that square
 *
 * @example
 * squareToWorldPosition("e4")
 * // Returns { x: 0.0289, y: 0.0174, z: 0.0289 }
 */
export const squareToWorldPosition = (square: SquareNotation): WorldPosition => {
  const pos = squareToPosition(square)
  return positionToWorldPosition(pos)
}

/**
 * Convert 3D world coordinates to a board Position (row, col)
 *
 * @param x - X coordinate in world space
 * @param z - Z coordinate in world space
 * @returns Board Position, or null if coordinates are outside the board
 *
 * @example
 * worldPositionToPosition(0.0289, -0.2026)
 * // Returns { row: 7, col: 4 } (e1)
 */
export const worldPositionToPosition = (x: number, z: number): Position | null => {
  // Calculate column and row from world coordinates
  // X: positive = higher column (toward h-file)
  const col = Math.round(x / SQUARE_SIZE + 3.5)
  // Z: positive = lower row (toward rank 8)
  const row = Math.round(3.5 - z / SQUARE_SIZE)

  // Bounds check
  if (col < 0 || col > 7 || row < 0 || row > 7) {
    return null
  }

  return { row, col }
}

/**
 * Convert 3D world coordinates to chess notation
 *
 * @param x - X coordinate in world space
 * @param z - Z coordinate in world space
 * @returns Chess notation (e.g., "e4"), or null if outside the board
 *
 * @example
 * worldPositionToSquare(0.0289, -0.2026)
 * // Returns "e1"
 */
export const worldPositionToSquare = (x: number, z: number): SquareNotation | null => {
  const pos = worldPositionToPosition(x, z)
  if (!pos) return null
  return positionToSquare(pos)
}

// =============================================================================
// MESH NAME MAPPING
// =============================================================================

/**
 * Initial piece positions mapping
 * Maps piece type, color, and index to starting square
 */
interface InitialPiecePosition {
  type: PieceType
  color: Color
  index: number
  square: SquareNotation
}

/**
 * All initial piece positions on a standard chess board
 * Index corresponds to the number suffix in mesh names (01, 02, etc.)
 *
 * GLTF mesh naming convention (verified from actual positions):
 * - White pieces _01 are on h-side (positive X), _02 are on a-side (negative X)
 * - Black pieces _01 are on a-side (negative X), _02 are on h-side (positive X)
 * - Pawns follow similar pattern based on their actual X coordinates
 */
const INITIAL_POSITIONS: InitialPiecePosition[] = [
  // White pieces - back rank
  // _01 pieces are on h-side (positive X), _02 on a-side (negative X)
  { type: 'rook', color: 'white', index: 1, square: 'h1' },
  { type: 'knight', color: 'white', index: 1, square: 'g1' },
  { type: 'bishop', color: 'white', index: 1, square: 'f1' },
  { type: 'queen', color: 'white', index: 0, square: 'd1' }, // No index suffix
  { type: 'king', color: 'white', index: 0, square: 'e1' }, // No index suffix
  { type: 'bishop', color: 'white', index: 2, square: 'c1' },
  { type: 'knight', color: 'white', index: 2, square: 'b1' },
  { type: 'rook', color: 'white', index: 2, square: 'a1' },
  // White pawns (01=h2, 08=a2 - numbered h→a based on GLTF X positions)
  { type: 'pawn', color: 'white', index: 1, square: 'h2' },
  { type: 'pawn', color: 'white', index: 2, square: 'g2' },
  { type: 'pawn', color: 'white', index: 3, square: 'f2' },
  { type: 'pawn', color: 'white', index: 4, square: 'e2' },
  { type: 'pawn', color: 'white', index: 5, square: 'd2' },
  { type: 'pawn', color: 'white', index: 6, square: 'c2' },
  { type: 'pawn', color: 'white', index: 7, square: 'b2' },
  { type: 'pawn', color: 'white', index: 8, square: 'a2' },
  // Black pieces - back rank
  // _01 pieces are on a-side (negative X), _02 on h-side (positive X)
  { type: 'rook', color: 'black', index: 1, square: 'a8' },
  { type: 'knight', color: 'black', index: 1, square: 'b8' },
  { type: 'bishop', color: 'black', index: 1, square: 'c8' },
  { type: 'queen', color: 'black', index: 0, square: 'd8' }, // No index suffix
  { type: 'king', color: 'black', index: 0, square: 'e8' }, // No index suffix
  { type: 'bishop', color: 'black', index: 2, square: 'f8' },
  { type: 'knight', color: 'black', index: 2, square: 'g8' },
  { type: 'rook', color: 'black', index: 2, square: 'h8' },
  // Black pawns (01=a7, 08=h7 - numbered a→h based on GLTF X positions)
  { type: 'pawn', color: 'black', index: 1, square: 'a7' },
  { type: 'pawn', color: 'black', index: 2, square: 'b7' },
  { type: 'pawn', color: 'black', index: 3, square: 'c7' },
  { type: 'pawn', color: 'black', index: 4, square: 'd7' },
  { type: 'pawn', color: 'black', index: 5, square: 'e7' },
  { type: 'pawn', color: 'black', index: 6, square: 'f7' },
  { type: 'pawn', color: 'black', index: 7, square: 'g7' },
  { type: 'pawn', color: 'black', index: 8, square: 'h7' },
]

/**
 * Parse a mesh name to extract piece type, color, and index
 *
 * @param meshName - Mesh name (e.g., "piece_knight_white_01", "piece_king_black")
 * @returns Parsed info or null if not a valid piece mesh name
 *
 * @example
 * parseMeshName("piece_knight_white_01")
 * // Returns { type: 'knight', color: 'white', index: 1 }
 *
 * parseMeshName("piece_king_black")
 * // Returns { type: 'king', color: 'black', index: 0 }
 */
export const parseMeshName = (
  meshName: string
): { type: PieceType; color: Color; index: number } | null => {
  // Match pattern: piece_<type>_<color>_<index> or piece_<type>_<color>
  const match = meshName.match(/^piece_(\w+)_(white|black)(?:_(\d+))?$/)
  if (!match) return null

  const pieceTypes: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']
  const type = match[1] as PieceType
  if (!pieceTypes.includes(type)) return null

  const color = match[2] as Color
  const index = match[3] ? parseInt(match[3], 10) : 0

  return { type, color, index }
}

/**
 * Get the initial square for a piece based on its mesh name
 *
 * This is used to determine the starting position of each piece
 * in the 3D model, which maps to a specific square on the board.
 *
 * @param meshName - Mesh name from the GLTF model
 * @returns Chess notation for the piece's starting square, or null if not found
 *
 * @example
 * getMeshInitialSquare("piece_pawn_white_03")
 * // Returns "c2"
 *
 * getMeshInitialSquare("piece_king_white")
 * // Returns "e1"
 */
export const getMeshInitialSquare = (meshName: string): SquareNotation | null => {
  const parsed = parseMeshName(meshName)
  if (!parsed) return null

  const position = INITIAL_POSITIONS.find(
    (p) => p.type === parsed.type && p.color === parsed.color && p.index === parsed.index
  )

  return position?.square ?? null
}

/**
 * Get all mesh names and their initial squares
 * Useful for debugging and verifying the mapping
 *
 * @returns Array of [meshName, square] tuples
 */
export const getAllInitialMeshSquares = (): [string, SquareNotation][] => {
  return INITIAL_POSITIONS.map((p) => {
    const meshName =
      p.index === 0
        ? `piece_${p.type}_${p.color}`
        : `piece_${p.type}_${p.color}_${String(p.index).padStart(2, '0')}`
    return [meshName, p.square]
  })
}
