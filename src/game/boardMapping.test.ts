/**
 * Board Mapping Tests
 *
 * Tests for bidirectional 3D ↔ Chess notation conversion
 */

import { describe, expect, test } from 'bun:test'
import {
  SQUARE_SIZE,
  BOARD_HALF_SIZE,
  PIECE_Y_OFFSET,
  positionToWorldPosition,
  squareToWorldPosition,
  worldPositionToPosition,
  worldPositionToSquare,
  parseMeshName,
  getMeshInitialSquare,
  getAllInitialMeshSquares,
} from './boardMapping'

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('Constants', () => {
  test('SQUARE_SIZE is approximately 0.0579', () => {
    expect(SQUARE_SIZE).toBeCloseTo(0.0578880906, 5)
  })

  test('BOARD_HALF_SIZE is 3.5 squares', () => {
    expect(BOARD_HALF_SIZE).toBeCloseTo(3.5 * SQUARE_SIZE, 5)
  })

  test('PIECE_Y_OFFSET is approximately 0.0174', () => {
    expect(PIECE_Y_OFFSET).toBeCloseTo(0.0174, 3)
  })
})

// =============================================================================
// POSITION TO WORLD POSITION TESTS
// =============================================================================

describe('positionToWorldPosition', () => {
  test('converts corner squares correctly', () => {
    // a1 (row 7, col 0) - white queen-side rook
    // a-file = negative X, rank 1 = negative Z
    const a1 = positionToWorldPosition({ row: 7, col: 0 })
    expect(a1.x).toBeCloseTo(-0.2026, 3)
    expect(a1.z).toBeCloseTo(-0.2026, 3)
    expect(a1.y).toBeCloseTo(PIECE_Y_OFFSET, 5)

    // h1 (row 7, col 7) - white king-side rook
    // h-file = positive X, rank 1 = negative Z
    const h1 = positionToWorldPosition({ row: 7, col: 7 })
    expect(h1.x).toBeCloseTo(0.2026, 3)
    expect(h1.z).toBeCloseTo(-0.2026, 3)

    // a8 (row 0, col 0) - black queen-side rook
    // a-file = negative X, rank 8 = positive Z
    const a8 = positionToWorldPosition({ row: 0, col: 0 })
    expect(a8.x).toBeCloseTo(-0.2026, 3)
    expect(a8.z).toBeCloseTo(0.2026, 3)

    // h8 (row 0, col 7) - black king-side rook
    // h-file = positive X, rank 8 = positive Z
    const h8 = positionToWorldPosition({ row: 0, col: 7 })
    expect(h8.x).toBeCloseTo(0.2026, 3)
    expect(h8.z).toBeCloseTo(0.2026, 3)
  })

  test('converts center squares correctly', () => {
    // e4 (row 4, col 4) - center of board
    // e-file (col 4) = 0.5 squares right of center = positive X
    const e4 = positionToWorldPosition({ row: 4, col: 4 })
    expect(e4.x).toBeCloseTo(0.5 * SQUARE_SIZE, 5)
    expect(e4.z).toBeCloseTo(-0.5 * SQUARE_SIZE, 5)

    // d4 (row 4, col 3)
    // d-file (col 3) = 0.5 squares left of center = negative X
    const d4 = positionToWorldPosition({ row: 4, col: 3 })
    expect(d4.x).toBeCloseTo(-0.5 * SQUARE_SIZE, 5)
    expect(d4.z).toBeCloseTo(-0.5 * SQUARE_SIZE, 5)
  })

  test('converts king starting positions correctly', () => {
    // e1 (row 7, col 4) - white king
    // e-file = 0.5 squares right of center = positive X
    const e1 = positionToWorldPosition({ row: 7, col: 4 })
    expect(e1.x).toBeCloseTo(0.5 * SQUARE_SIZE, 5)
    expect(e1.z).toBeCloseTo(-3.5 * SQUARE_SIZE, 5)

    // e8 (row 0, col 4) - black king
    const e8 = positionToWorldPosition({ row: 0, col: 4 })
    expect(e8.x).toBeCloseTo(0.5 * SQUARE_SIZE, 5)
    expect(e8.z).toBeCloseTo(3.5 * SQUARE_SIZE, 5)
  })
})

// =============================================================================
// SQUARE TO WORLD POSITION TESTS
// =============================================================================

describe('squareToWorldPosition', () => {
  test('converts notation to world position', () => {
    // e-file (col 4) = 0.5 squares right of center = positive X
    const e4 = squareToWorldPosition('e4')
    expect(e4.x).toBeCloseTo(0.5 * SQUARE_SIZE, 5)
    expect(e4.z).toBeCloseTo(-0.5 * SQUARE_SIZE, 5)
    expect(e4.y).toBeCloseTo(PIECE_Y_OFFSET, 5)
  })

  test('matches positionToWorldPosition for same square', () => {
    const fromNotation = squareToWorldPosition('a1')
    const fromPosition = positionToWorldPosition({ row: 7, col: 0 })

    expect(fromNotation.x).toBeCloseTo(fromPosition.x, 10)
    expect(fromNotation.y).toBeCloseTo(fromPosition.y, 10)
    expect(fromNotation.z).toBeCloseTo(fromPosition.z, 10)
  })
})

// =============================================================================
// WORLD POSITION TO POSITION TESTS
// =============================================================================

describe('worldPositionToPosition', () => {
  test('converts corner world positions correctly', () => {
    // a1 - negative X (a-file), negative Z (rank 1)
    const a1 = worldPositionToPosition(-0.2026, -0.2026)
    expect(a1).toEqual({ row: 7, col: 0 })

    // h8 - positive X (h-file), positive Z (rank 8)
    const h8 = worldPositionToPosition(0.2026, 0.2026)
    expect(h8).toEqual({ row: 0, col: 7 })
  })

  test('returns null for out of bounds positions', () => {
    // Too far left (beyond a-file)
    expect(worldPositionToPosition(0.3, 0)).toBeNull()

    // Too far right (beyond h-file)
    expect(worldPositionToPosition(-0.3, 0)).toBeNull()

    // Too far toward white (beyond rank 1)
    expect(worldPositionToPosition(0, -0.3)).toBeNull()

    // Too far toward black (beyond rank 8)
    expect(worldPositionToPosition(0, 0.3)).toBeNull()
  })

  test('handles positions near square boundaries', () => {
    // Slightly off-center should still map to correct square
    const centerOfE4 = positionToWorldPosition({ row: 4, col: 4 })
    const slightlyOff = worldPositionToPosition(
      centerOfE4.x + SQUARE_SIZE * 0.3,
      centerOfE4.z + SQUARE_SIZE * 0.3
    )
    expect(slightlyOff).toEqual({ row: 4, col: 4 })
  })
})

// =============================================================================
// WORLD POSITION TO SQUARE TESTS
// =============================================================================

describe('worldPositionToSquare', () => {
  test('converts world position to notation', () => {
    // a1: negative X (a-file), negative Z (rank 1)
    expect(worldPositionToSquare(-0.2026, -0.2026)).toBe('a1')
    // h8: positive X (h-file), positive Z (rank 8)
    expect(worldPositionToSquare(0.2026, 0.2026)).toBe('h8')
  })

  test('returns null for out of bounds', () => {
    expect(worldPositionToSquare(0.5, 0.5)).toBeNull()
  })
})

// =============================================================================
// ROUND-TRIP CONVERSION TESTS
// =============================================================================

describe('Round-trip conversions', () => {
  test('all 64 squares convert correctly both ways', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}`

        // Square → World → Square
        const worldPos = squareToWorldPosition(square)
        const backToSquare = worldPositionToSquare(worldPos.x, worldPos.z)

        expect(backToSquare).toBe(square)
      }
    }
  })
})

// =============================================================================
// MESH NAME PARSING TESTS
// =============================================================================

describe('parseMeshName', () => {
  test('parses piece names with index', () => {
    const result = parseMeshName('piece_knight_white_01')
    expect(result).toEqual({ type: 'knight', color: 'white', index: 1 })
  })

  test('parses piece names without index (king/queen)', () => {
    const king = parseMeshName('piece_king_black')
    expect(king).toEqual({ type: 'king', color: 'black', index: 0 })

    const queen = parseMeshName('piece_queen_white')
    expect(queen).toEqual({ type: 'queen', color: 'white', index: 0 })
  })

  test('parses all piece types', () => {
    expect(parseMeshName('piece_pawn_white_05')?.type).toBe('pawn')
    expect(parseMeshName('piece_rook_black_02')?.type).toBe('rook')
    expect(parseMeshName('piece_bishop_white_01')?.type).toBe('bishop')
  })

  test('returns null for invalid names', () => {
    expect(parseMeshName('board')).toBeNull()
    expect(parseMeshName('invalid')).toBeNull()
    expect(parseMeshName('piece_invalid_white_01')).toBeNull()
    expect(parseMeshName('piece_pawn_red_01')).toBeNull()
  })
})

// =============================================================================
// MESH INITIAL SQUARE TESTS
// =============================================================================

describe('getMeshInitialSquare', () => {
  // White pieces - _01 is h-side, _02 is a-side (based on positive X = h-file)
  test('maps white pawns correctly (01=h2, 08=a2)', () => {
    expect(getMeshInitialSquare('piece_pawn_white_01')).toBe('h2')
    expect(getMeshInitialSquare('piece_pawn_white_02')).toBe('g2')
    expect(getMeshInitialSquare('piece_pawn_white_03')).toBe('f2')
    expect(getMeshInitialSquare('piece_pawn_white_04')).toBe('e2')
    expect(getMeshInitialSquare('piece_pawn_white_05')).toBe('d2')
    expect(getMeshInitialSquare('piece_pawn_white_06')).toBe('c2')
    expect(getMeshInitialSquare('piece_pawn_white_07')).toBe('b2')
    expect(getMeshInitialSquare('piece_pawn_white_08')).toBe('a2')
  })

  test('maps white back rank correctly (01=h-side, 02=a-side)', () => {
    expect(getMeshInitialSquare('piece_rook_white_01')).toBe('h1')
    expect(getMeshInitialSquare('piece_knight_white_01')).toBe('g1')
    expect(getMeshInitialSquare('piece_bishop_white_01')).toBe('f1')
    expect(getMeshInitialSquare('piece_queen_white')).toBe('d1')
    expect(getMeshInitialSquare('piece_king_white')).toBe('e1')
    expect(getMeshInitialSquare('piece_bishop_white_02')).toBe('c1')
    expect(getMeshInitialSquare('piece_knight_white_02')).toBe('b1')
    expect(getMeshInitialSquare('piece_rook_white_02')).toBe('a1')
  })

  // Black pieces - _01 is a-side, _02 is h-side (based on negative X = a-file for black)
  test('maps black pawns correctly (01=a7, 08=h7)', () => {
    expect(getMeshInitialSquare('piece_pawn_black_01')).toBe('a7')
    expect(getMeshInitialSquare('piece_pawn_black_02')).toBe('b7')
    expect(getMeshInitialSquare('piece_pawn_black_03')).toBe('c7')
    expect(getMeshInitialSquare('piece_pawn_black_04')).toBe('d7')
    expect(getMeshInitialSquare('piece_pawn_black_05')).toBe('e7')
    expect(getMeshInitialSquare('piece_pawn_black_06')).toBe('f7')
    expect(getMeshInitialSquare('piece_pawn_black_07')).toBe('g7')
    expect(getMeshInitialSquare('piece_pawn_black_08')).toBe('h7')
  })

  test('maps black back rank correctly (01=a-side, 02=h-side)', () => {
    expect(getMeshInitialSquare('piece_rook_black_01')).toBe('a8')
    expect(getMeshInitialSquare('piece_knight_black_01')).toBe('b8')
    expect(getMeshInitialSquare('piece_bishop_black_01')).toBe('c8')
    expect(getMeshInitialSquare('piece_queen_black')).toBe('d8')
    expect(getMeshInitialSquare('piece_king_black')).toBe('e8')
    expect(getMeshInitialSquare('piece_bishop_black_02')).toBe('f8')
    expect(getMeshInitialSquare('piece_knight_black_02')).toBe('g8')
    expect(getMeshInitialSquare('piece_rook_black_02')).toBe('h8')
  })

  test('returns null for invalid mesh names', () => {
    expect(getMeshInitialSquare('board')).toBeNull()
    expect(getMeshInitialSquare('invalid')).toBeNull()
  })
})

// =============================================================================
// GET ALL INITIAL MESH SQUARES TESTS
// =============================================================================

describe('getAllInitialMeshSquares', () => {
  test('returns 32 piece mappings', () => {
    const mappings = getAllInitialMeshSquares()
    expect(mappings.length).toBe(32)
  })

  test('includes all expected mesh names', () => {
    const mappings = getAllInitialMeshSquares()
    const meshNames = mappings.map(([name]) => name)

    // Check some specific pieces
    expect(meshNames).toContain('piece_king_white')
    expect(meshNames).toContain('piece_queen_black')
    expect(meshNames).toContain('piece_pawn_white_01')
    expect(meshNames).toContain('piece_rook_black_02')
  })
})

// =============================================================================
// GLTF POSITION VERIFICATION TESTS
// =============================================================================

describe('GLTF position verification', () => {
  // These tests verify that our formulas match the actual GLTF positions
  // Key insight: positive X = h-file, negative X = a-file

  test('white king position matches GLTF', () => {
    // From GLTF: piece_king_white at [0.028944039717316628, _, -0.20260828733444214]
    // e1: e-file (col 4) = 0.5 squares right of center = positive X
    const e1 = squareToWorldPosition('e1')
    expect(e1.x).toBeCloseTo(0.0289, 3)
    expect(e1.z).toBeCloseTo(-0.2026, 3)
  })

  test('black king position matches GLTF', () => {
    // From GLTF: piece_king_black at [0.028944021090865135, _, 0.2026081383228302]
    // e8: e-file (col 4) = positive X, rank 8 = positive Z
    const e8 = squareToWorldPosition('e8')
    expect(e8.x).toBeCloseTo(0.0289, 3)
    expect(e8.z).toBeCloseTo(0.2026, 3)
  })

  test('white rooks match GLTF positions', () => {
    // piece_rook_white_01 at [0.20260828733444214, _, -0.20260828733444214] = h1 (positive X = h-file)
    const h1 = squareToWorldPosition('h1')
    expect(h1.x).toBeCloseTo(0.2026, 3)
    expect(h1.z).toBeCloseTo(-0.2026, 3)

    // piece_rook_white_02 at [-0.20260828733444214, _, -0.20260828733444214] = a1 (negative X = a-file)
    const a1 = squareToWorldPosition('a1')
    expect(a1.x).toBeCloseTo(-0.2026, 3)
    expect(a1.z).toBeCloseTo(-0.2026, 3)
  })

  test('pawn positions match GLTF', () => {
    // piece_pawn_white_04 at [0.028944039717316628, _, -0.144720196723938] = e2 (positive X = e-file)
    const e2 = squareToWorldPosition('e2')
    expect(e2.x).toBeCloseTo(0.0289, 3)
    expect(e2.z).toBeCloseTo(-0.1447, 3)

    // piece_pawn_black_05 at [0.028944039717316628, _, 0.14401185512542725] = e7
    const e7 = squareToWorldPosition('e7')
    expect(e7.x).toBeCloseTo(0.0289, 3)
    expect(e7.z).toBeCloseTo(0.1447, 3)
  })
})
