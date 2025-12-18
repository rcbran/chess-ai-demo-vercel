/**
 * Test utilities for chess engine testing
 *
 * This module provides helper functions for setting up chess positions
 * in tests without needing to execute complex move sequences.
 *
 * @module testUtils
 */

import type { Board, Color, GameState, Piece, CastlingRights } from './types'
import type { PieceType } from '../data/pieceData'
import { initializeGameState, fenToGameState, squareToPosition } from './chessEngine'

/**
 * Piece placement description for setting up test positions
 */
export interface PiecePlacement {
  /** Chess notation square (e.g., "e4", "a1") */
  square: string
  /** Type of piece */
  type: PieceType
  /** Color of piece */
  color: Color
  /** Whether piece has moved (affects castling/pawn double move) */
  hasMoved?: boolean
}

/**
 * Options for creating a custom test game state
 */
export interface TestGameStateOptions {
  /** Pieces to place on the board (clears board first if provided) */
  pieces?: PiecePlacement[]
  /** Which color moves next */
  currentTurn?: Color
  /** Override castling rights */
  castlingRights?: Partial<CastlingRights>
  /** En passant target square in chess notation, or null */
  enPassantTarget?: string | null
  /** Half-move clock for 50-move rule */
  halfMoveClock?: number
  /** Full move number */
  fullMoveNumber?: number
}

/**
 * Create a game state with specific pieces placed on the board
 * Much easier than executing complex move sequences
 * 
 * @example
 * ```ts
 * // Create a simple checkmate position
 * const gameState = createTestPosition({
 *   pieces: [
 *     { square: 'e8', type: 'king', color: 'black' },
 *     { square: 'e7', type: 'queen', color: 'white' },
 *     { square: 'e1', type: 'king', color: 'white' },
 *   ],
 *   currentTurn: 'black',
 * })
 * ```
 */
export const createTestPosition = (options: TestGameStateOptions = {}): GameState => {
  const gameState = initializeGameState()

  // Clear board if pieces are provided
  if (options.pieces) {
    gameState.board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null))

    // Place pieces
    for (const placement of options.pieces) {
      const pos = squareToPosition(placement.square)
      const piece: Piece = {
        type: placement.type,
        color: placement.color,
        hasMoved: placement.hasMoved ?? false,
      }
      gameState.board[pos.row][pos.col] = piece
    }

    // When custom pieces are provided, castling rights should default to false
    // unless explicitly provided (since custom boards may not have kings/rooks in starting positions)
    if (options.castlingRights === undefined) {
      gameState.castlingRights = {
        whiteKingSide: false,
        whiteQueenSide: false,
        blackKingSide: false,
        blackQueenSide: false,
      }
    }
  }

  // Set current turn
  if (options.currentTurn) {
    gameState.currentTurn = options.currentTurn
  }

  // Set castling rights (merge if custom pieces weren't provided, or if explicitly set)
  if (options.castlingRights) {
    gameState.castlingRights = {
      ...gameState.castlingRights,
      ...options.castlingRights,
    }
  }

  // Set en passant target
  if (options.enPassantTarget === null || options.enPassantTarget === '-' || options.enPassantTarget === '') {
    gameState.enPassantTarget = null
  } else if (options.enPassantTarget) {
    gameState.enPassantTarget = squareToPosition(options.enPassantTarget)
  }

  // Set half move clock
  if (options.halfMoveClock !== undefined) {
    gameState.halfMoveClock = options.halfMoveClock
  }

  // Set full move number
  if (options.fullMoveNumber !== undefined) {
    gameState.fullMoveNumber = options.fullMoveNumber
  }

  return gameState
}

/**
 * Create a game state from FEN notation
 * Useful for setting up well-known positions
 * 
 * @example
 * ```ts
 * // Starting position
 * const gameState = createFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
 * 
 * // Italian Game position
 * const gameState = createFromFen('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3')
 * ```
 */
export const createFromFen = fenToGameState

/**
 * Create an empty board
 */
export const createEmptyBoard = (): Board => {
  return Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))
}

/**
 * Modify an existing game state's board at a specific square
 * 
 * @example
 * ```ts
 * let gameState = initializeGameState()
 * gameState = setPieceAt(gameState, 'e4', { type: 'pawn', color: 'white', hasMoved: true })
 * gameState = clearSquare(gameState, 'e2')
 * ```
 */
export const setPieceAt = (
  gameState: GameState,
  square: string,
  piece: Piece | null
): GameState => {
  const pos = squareToPosition(square)
  const newBoard = gameState.board.map((row) => [...row])
  newBoard[pos.row][pos.col] = piece
  return { ...gameState, board: newBoard }
}

/**
 * Clear a square on the board
 */
export const clearSquare = (gameState: GameState, square: string): GameState => {
  return setPieceAt(gameState, square, null)
}

/**
 * Get a piece at a specific square using chess notation
 */
export const pieceAt = (gameState: GameState, square: string): Piece | null => {
  const pos = squareToPosition(square)
  return gameState.board[pos.row][pos.col]
}

/**
 * Common test positions as FEN strings
 */
export const TEST_POSITIONS = {
  /** Starting position */
  STARTING: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  
  /** After 1.e4 */
  AFTER_E4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  
  /** After 1.e4 e5 */
  AFTER_E4_E5: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  
  /** Italian Game: 1.e4 e5 2.Nf3 Nc6 3.Bc4 */
  ITALIAN_GAME: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  
  /** White can castle kingside */
  CASTLE_KINGSIDE_READY: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  
  /** Scholars mate (checkmate) */
  SCHOLARS_MATE: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
  
  /** Stalemate position - black king in corner, rook controls escape squares */
  STALEMATE: 'k7/1R6/2K5/8/8/8/8/8 b - - 0 1',
  
  /** Empty board with just kings */
  KINGS_ONLY: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
} as const

