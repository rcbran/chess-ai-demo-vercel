/**
 * Chess Engine - Core game logic for chess
 *
 * This module provides all the functionality needed to play a game of chess:
 * - Board initialization and state management
 * - Move validation for all piece types
 * - Special moves: castling, en passant, pawn promotion
 * - Check, checkmate, and stalemate detection
 * - FEN notation support for position serialization
 *
 * @module chessEngine
 */

import type {
  Board,
  Color,
  GameState,
  Move,
  Piece,
  Position,
  Square,
  SquareNotation,
} from './types'
import type { PieceType } from '../data/pieceData'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert chess notation to board position
 *
 * @param square - Chess notation (e.g., "e4", "a1", "h8")
 * @returns Position object with row and col indices
 *
 * @example
 * squareToPosition("e4") // { row: 4, col: 4 }
 * squareToPosition("a1") // { row: 7, col: 0 }
 */
export const squareToPosition = (square: SquareNotation): Position => {
  const file = square[0].charCodeAt(0) - 97 // a=0, h=7
  const rank = 8 - parseInt(square[1], 10) // 1=7, 8=0
  return { row: rank, col: file }
}

/**
 * Convert board position to chess notation
 *
 * @param pos - Position object with row and col indices
 * @returns Chess notation string (e.g., "e4")
 *
 * @example
 * positionToSquare({ row: 4, col: 4 }) // "e5"
 * positionToSquare({ row: 7, col: 0 }) // "a1"
 */
export const positionToSquare = (pos: Position): SquareNotation => {
  const file = String.fromCharCode(97 + pos.col) // 0=a, 7=h
  const rank = 8 - pos.row // 0=8, 7=1
  return `${file}${rank}` as SquareNotation
}

/**
 * Check if a position is within the 8x8 board bounds
 */
const isValidPosition = (pos: Position): boolean => {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8
}

/**
 * Get the opponent's color
 */
const getOpponentColor = (color: Color): Color => {
  return color === 'white' ? 'black' : 'white'
}

/**
 * Get the piece at a specific board position
 *
 * @param board - The chess board
 * @param pos - Position to check
 * @returns The piece at that position, or null if empty/invalid
 */
export const getPieceAt = (board: Board, pos: Position): Square => {
  if (!isValidPosition(pos)) return null
  return board[pos.row][pos.col]
}

/**
 * Create a deep copy of the board (pieces are copied, not referenced)
 */
const copyBoard = (board: Board): Board => {
  return board.map((row) => row.map((square) => (square ? { ...square } : null)))
}

// =============================================================================
// BOARD & GAME STATE INITIALIZATION
// =============================================================================

/**
 * Create a new chess board with pieces in starting positions
 *
 * @returns 8x8 board array with all pieces in standard starting positions
 *
 * Board layout (row indices):
 * - Row 0: Black back rank (rank 8)
 * - Row 1: Black pawns (rank 7)
 * - Rows 2-5: Empty squares (ranks 6-3)
 * - Row 6: White pawns (rank 2)
 * - Row 7: White back rank (rank 1)
 */
export const initializeBoard = (): Board => {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  // Place pawns
  for (let col = 0; col < 8; col++) {
    board[6][col] = { type: 'pawn', color: 'white', hasMoved: false }
    board[1][col] = { type: 'pawn', color: 'black', hasMoved: false }
  }

  // Place white pieces
  board[7][0] = { type: 'rook', color: 'white', hasMoved: false }
  board[7][1] = { type: 'knight', color: 'white', hasMoved: false }
  board[7][2] = { type: 'bishop', color: 'white', hasMoved: false }
  board[7][3] = { type: 'queen', color: 'white', hasMoved: false }
  board[7][4] = { type: 'king', color: 'white', hasMoved: false }
  board[7][5] = { type: 'bishop', color: 'white', hasMoved: false }
  board[7][6] = { type: 'knight', color: 'white', hasMoved: false }
  board[7][7] = { type: 'rook', color: 'white', hasMoved: false }

  // Place black pieces
  board[0][0] = { type: 'rook', color: 'black', hasMoved: false }
  board[0][1] = { type: 'knight', color: 'black', hasMoved: false }
  board[0][2] = { type: 'bishop', color: 'black', hasMoved: false }
  board[0][3] = { type: 'queen', color: 'black', hasMoved: false }
  board[0][4] = { type: 'king', color: 'black', hasMoved: false }
  board[0][5] = { type: 'bishop', color: 'black', hasMoved: false }
  board[0][6] = { type: 'knight', color: 'black', hasMoved: false }
  board[0][7] = { type: 'rook', color: 'black', hasMoved: false }

  return board
}

/**
 * Create a new game state with standard starting position
 *
 * @returns Complete game state ready to play
 */
export const initializeGameState = (): GameState => {
  return {
    board: initializeBoard(),
    currentTurn: 'white',
    castlingRights: {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
  }
}

// =============================================================================
// ATTACK & CHECK DETECTION
// =============================================================================

/**
 * Determine if a square is under attack by pieces of a given color
 *
 * @param board - Current board state
 * @param pos - Position to check for attacks
 * @param attackerColor - Color of the attacking pieces to check
 * @returns true if any piece of attackerColor can capture on this square
 */
export const isSquareUnderAttack = (
  board: Board,
  pos: Position,
  attackerColor: Color
): boolean => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.color === attackerColor) {
        // Use attack-only moves (pawns only attack diagonally, not forward)
        const attackMoves = getPieceAttackMoves(board, { row, col }, piece)
        if (attackMoves.some((move) => move.row === pos.row && move.col === pos.col)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Determine if the king of the given color is in check
 *
 * @param board - Current board state
 * @param color - Color of the king to check
 * @returns true if the king is under attack by opponent pieces
 */
export const isInCheck = (board: Board, color: Color): boolean => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.type === 'king' && piece.color === color) {
        return isSquareUnderAttack(board, { row, col }, getOpponentColor(color))
      }
    }
  }
  return false
}

// =============================================================================
// PIECE MOVE GENERATION
// =============================================================================

/**
 * Get all possible moves for a piece (without check validation)
 * These are "pseudo-legal" moves that may leave the king in check
 */
const getPieceMoves = (board: Board, pos: Position, piece: Piece): Position[] => {
  switch (piece.type) {
    case 'pawn':
      return getPawnMoves(board, pos, piece)
    case 'rook':
      return getSlidingMoves(board, pos, piece, ROOK_DIRECTIONS)
    case 'knight':
      return getKnightMoves(board, pos, piece)
    case 'bishop':
      return getSlidingMoves(board, pos, piece, BISHOP_DIRECTIONS)
    case 'queen':
      return getSlidingMoves(board, pos, piece, QUEEN_DIRECTIONS)
    case 'king':
      return getKingMoves(board, pos, piece)
  }
}

/** Direction vectors for rook movement (orthogonal) */
const ROOK_DIRECTIONS = [
  { row: -1, col: 0 }, // up
  { row: 1, col: 0 }, // down
  { row: 0, col: -1 }, // left
  { row: 0, col: 1 }, // right
]

/** Direction vectors for bishop movement (diagonal) */
const BISHOP_DIRECTIONS = [
  { row: -1, col: -1 }, // up-left
  { row: -1, col: 1 }, // up-right
  { row: 1, col: -1 }, // down-left
  { row: 1, col: 1 }, // down-right
]

/** Direction vectors for queen movement (orthogonal + diagonal) */
const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS]

/** Offset vectors for knight movement (L-shape) */
const KNIGHT_OFFSETS = [
  { row: -2, col: -1 },
  { row: -2, col: 1 },
  { row: -1, col: -2 },
  { row: -1, col: 2 },
  { row: 1, col: -2 },
  { row: 1, col: 2 },
  { row: 2, col: -1 },
  { row: 2, col: 1 },
]

/** Offset vectors for king movement (one square any direction) */
const KING_OFFSETS = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
]

/**
 * Get moves for sliding pieces (rook, bishop, queen)
 * Slides in each direction until hitting a piece or board edge
 */
const getSlidingMoves = (
  board: Board,
  pos: Position,
  piece: Piece,
  directions: { row: number; col: number }[]
): Position[] => {
  const moves: Position[] = []

  for (const dir of directions) {
    for (let i = 1; i < 8; i++) {
      const newPos: Position = { row: pos.row + dir.row * i, col: pos.col + dir.col * i }
      if (!isValidPosition(newPos)) break

      const target = getPieceAt(board, newPos)
      if (!target) {
        moves.push(newPos)
      } else {
        if (target.color !== piece.color) {
          moves.push(newPos) // Can capture
        }
        break // Blocked by piece
      }
    }
  }

  return moves
}

/**
 * Get pawn attack moves (diagonal captures only)
 * Used for attack detection, not regular move generation
 */
const getPawnAttackMoves = (board: Board, pos: Position, piece: Piece): Position[] => {
  const moves: Position[] = []
  const direction = piece.color === 'white' ? -1 : 1

  // Only diagonal captures (attacks)
  const captureLeft: Position = { row: pos.row + direction, col: pos.col - 1 }
  const captureRight: Position = { row: pos.row + direction, col: pos.col + 1 }

  for (const capturePos of [captureLeft, captureRight]) {
    if (isValidPosition(capturePos)) {
      // In attack mode, we check if square is attacked (can be empty or enemy piece)
      const target = getPieceAt(board, capturePos)
      if (!target || target.color !== piece.color) {
        moves.push(capturePos)
      }
    }
  }

  return moves
}

/**
 * Get pawn moves (forward movement and diagonal captures)
 * Note: En passant is handled separately in getValidMoves
 */
const getPawnMoves = (board: Board, pos: Position, piece: Piece): Position[] => {
  const moves: Position[] = []
  const direction = piece.color === 'white' ? -1 : 1
  const startRow = piece.color === 'white' ? 6 : 1

  // Move forward one square
  const oneForward: Position = { row: pos.row + direction, col: pos.col }
  if (isValidPosition(oneForward) && !getPieceAt(board, oneForward)) {
    moves.push(oneForward)

    // Move forward two squares (first move only)
    if (pos.row === startRow && !piece.hasMoved) {
      const twoForward: Position = { row: pos.row + 2 * direction, col: pos.col }
      if (isValidPosition(twoForward) && !getPieceAt(board, twoForward)) {
        moves.push(twoForward)
      }
    }
  }

  // Capture diagonally
  const captureLeft: Position = { row: pos.row + direction, col: pos.col - 1 }
  const captureRight: Position = { row: pos.row + direction, col: pos.col + 1 }

  for (const capturePos of [captureLeft, captureRight]) {
    if (isValidPosition(capturePos)) {
      const target = getPieceAt(board, capturePos)
      if (target && target.color !== piece.color) {
        moves.push(capturePos)
      }
    }
  }

  return moves
}

/**
 * Get attack-only moves for a piece (used for attack detection)
 * For pawns: only diagonal captures
 * For other pieces: same as regular moves (they attack the same squares they can move to)
 */
const getPieceAttackMoves = (board: Board, pos: Position, piece: Piece): Position[] => {
  if (piece.type === 'pawn') {
    return getPawnAttackMoves(board, pos, piece)
  }
  // For all other pieces, attack moves are the same as regular moves
  return getPieceMoves(board, pos, piece)
}

/**
 * Get knight moves (L-shape jumps, can hop over pieces)
 */
const getKnightMoves = (board: Board, pos: Position, piece: Piece): Position[] => {
  const moves: Position[] = []

  for (const offset of KNIGHT_OFFSETS) {
    const newPos: Position = { row: pos.row + offset.row, col: pos.col + offset.col }
    if (!isValidPosition(newPos)) continue

    const target = getPieceAt(board, newPos)
    if (!target || target.color !== piece.color) {
      moves.push(newPos)
    }
  }

  return moves
}

/**
 * Get king moves (one square in any direction)
 * Note: Castling is handled separately in getValidMoves
 */
const getKingMoves = (board: Board, pos: Position, piece: Piece): Position[] => {
  const moves: Position[] = []

  for (const offset of KING_OFFSETS) {
    const newPos: Position = { row: pos.row + offset.row, col: pos.col + offset.col }
    if (!isValidPosition(newPos)) continue

    const target = getPieceAt(board, newPos)
    if (!target || target.color !== piece.color) {
      moves.push(newPos)
    }
  }

  return moves
}

// =============================================================================
// MOVE VALIDATION
// =============================================================================

/**
 * Get all legal moves for a piece at a given position
 *
 * This filters out moves that would leave the king in check,
 * and includes special moves (castling, en passant) where applicable.
 *
 * @param gameState - Current game state
 * @param from - Position of the piece to move
 * @returns Array of valid destination positions (empty if no valid moves)
 *
 * @example
 * const moves = getValidMoves(gameState, { row: 6, col: 4 }) // e2 pawn
 * // Returns [{ row: 5, col: 4 }, { row: 4, col: 4 }] for initial pawn moves
 */
export const getValidMoves = (
  gameState: GameState,
  from: Position
): Position[] => {
  const piece = getPieceAt(gameState.board, from)
  if (!piece || piece.color !== gameState.currentTurn) {
    return []
  }

  // Get all possible moves for the piece
  const possibleMoves = getPieceMoves(gameState.board, from, piece)

  // Filter moves that would leave the king in check
  const validMoves: Position[] = []
  for (const move of possibleMoves) {
    // Simulate the move and check if king is still in check
    const testBoard = copyBoard(gameState.board)
    testBoard[move.row][move.col] = { ...piece, hasMoved: true }
    testBoard[from.row][from.col] = null

    // Check if this move leaves the king in check
    if (!isInCheck(testBoard, piece.color)) {
      validMoves.push(move)
    }
  }

  // Add castling moves if applicable
  if (piece.type === 'king' && !piece.hasMoved) {
    const castlingMoves = getCastlingMoves(gameState, from)
    for (const castlingMove of castlingMoves) {
      // Verify castling doesn't leave king in check
      const testBoard = copyBoard(gameState.board)
      testBoard[castlingMove.row][castlingMove.col] = { ...piece, hasMoved: true }
      testBoard[from.row][from.col] = null
      if (!isInCheck(testBoard, piece.color)) {
        validMoves.push(castlingMove)
      }
    }
  }

  // Add en passant moves if applicable
  if (piece.type === 'pawn' && gameState.enPassantTarget) {
    const enPassantMove = getEnPassantMove(gameState, from)
    if (enPassantMove) {
      // Verify en passant doesn't leave king in check
      const testBoard = copyBoard(gameState.board)
      testBoard[enPassantMove.row][enPassantMove.col] = { ...piece, hasMoved: true }
      testBoard[from.row][from.col] = null
      const direction = piece.color === 'white' ? -1 : 1
      const capturedPawnPos: Position = {
        row: enPassantMove.row - direction,
        col: enPassantMove.col,
      }
      testBoard[capturedPawnPos.row][capturedPawnPos.col] = null
      if (!isInCheck(testBoard, piece.color)) {
        validMoves.push(enPassantMove)
      }
    }
  }

  return validMoves
}

// =============================================================================
// SPECIAL MOVES
// =============================================================================

/**
 * Get available castling moves for the king
 * Checks all castling preconditions: rights, path clear, not through check
 */
const getCastlingMoves = (gameState: GameState, kingPos: Position): Position[] => {
  const moves: Position[] = []
  const piece = getPieceAt(gameState.board, kingPos)
  if (!piece || piece.type !== 'king' || piece.hasMoved) return moves

  const color = piece.color
  const row = color === 'white' ? 7 : 0
  const opponentColor = getOpponentColor(color)

  // Check if king is in check
  if (isInCheck(gameState.board, color)) return moves

  // King-side castling
  if (
    (color === 'white' && gameState.castlingRights.whiteKingSide) ||
    (color === 'black' && gameState.castlingRights.blackKingSide)
  ) {
    const rook = getPieceAt(gameState.board, { row, col: 7 })
    if (
      rook &&
      rook.type === 'rook' &&
      rook.color === color &&
      !rook.hasMoved &&
      !getPieceAt(gameState.board, { row, col: 5 }) &&
      !getPieceAt(gameState.board, { row, col: 6 }) &&
      !isSquareUnderAttack(gameState.board, { row, col: 5 }, opponentColor) &&
      !isSquareUnderAttack(gameState.board, { row, col: 6 }, opponentColor)
    ) {
      moves.push({ row, col: 6 })
    }
  }

  // Queen-side castling
  if (
    (color === 'white' && gameState.castlingRights.whiteQueenSide) ||
    (color === 'black' && gameState.castlingRights.blackQueenSide)
  ) {
    const rook = getPieceAt(gameState.board, { row, col: 0 })
    if (
      rook &&
      rook.type === 'rook' &&
      rook.color === color &&
      !rook.hasMoved &&
      !getPieceAt(gameState.board, { row, col: 1 }) &&
      !getPieceAt(gameState.board, { row, col: 2 }) &&
      !getPieceAt(gameState.board, { row, col: 3 }) &&
      !isSquareUnderAttack(gameState.board, { row, col: 2 }, opponentColor) &&
      !isSquareUnderAttack(gameState.board, { row, col: 3 }, opponentColor)
    ) {
      moves.push({ row, col: 2 })
    }
  }

  return moves
}

/**
 * Get en passant capture move if available
 * Returns the en passant target square if the pawn can capture
 */
const getEnPassantMove = (gameState: GameState, pawnPos: Position): Position | null => {
  if (!gameState.enPassantTarget) return null

  const piece = getPieceAt(gameState.board, pawnPos)
  if (!piece || piece.type !== 'pawn') return null

  const direction = piece.color === 'white' ? -1 : 1
  const enPassantRow = gameState.enPassantTarget.row
  const enPassantCol = gameState.enPassantTarget.col

  // Check if pawn is adjacent to en passant target
  if (
    pawnPos.row === enPassantRow - direction &&
    Math.abs(pawnPos.col - enPassantCol) === 1
  ) {
    // Verify there is an opponent pawn on the captured square
    // The captured pawn is on the same row as the capturing pawn, same file as en passant target
    const capturedPawnPos: Position = {
      row: pawnPos.row, // Same row as the capturing pawn
      col: enPassantCol, // Same file as the en passant target
    }
    const capturedPiece = getPieceAt(gameState.board, capturedPawnPos)

    if (
      capturedPiece &&
      capturedPiece.type === 'pawn' &&
      capturedPiece.color !== piece.color
    ) {
      return gameState.enPassantTarget
    }
  }

  return null
}

/**
 * Check if a move is legal
 *
 * @param gameState - Current game state
 * @param from - Starting position
 * @param to - Destination position
 * @returns true if the move is legal
 *
 * @example
 * isValidMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e2-e4
 */
export const isValidMove = (
  gameState: GameState,
  from: Position,
  to: Position
): boolean => {
  const piece = getPieceAt(gameState.board, from)
  if (!piece || piece.color !== gameState.currentTurn) {
    return false
  }

  // Get all valid moves for this piece
  const validMoves = getValidMoves(gameState, from)
  return validMoves.some((move) => move.row === to.row && move.col === to.col)
}

// =============================================================================
// MOVE EXECUTION
// =============================================================================

/**
 * Execute a move and return the new game state
 *
 * This is the main function for making moves. It handles:
 * - Regular piece movement
 * - Captures
 * - Castling (king moves 2 squares)
 * - En passant captures
 * - Pawn promotion (defaults to queen if not specified)
 * - Updating game status (check, checkmate, stalemate)
 *
 * @param gameState - Current game state (not modified)
 * @param from - Starting position
 * @param to - Destination position
 * @param promotion - Piece type for pawn promotion (optional, defaults to queen)
 * @returns New game state after the move
 * @throws Error if the move is invalid
 *
 * @example
 * // Regular move
 * const newState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 })
 *
 * // Pawn promotion to knight
 * const newState = makeMove(gameState, { row: 1, col: 0 }, { row: 0, col: 0 }, 'knight')
 */
export const makeMove = (
  gameState: GameState,
  from: Position,
  to: Position,
  promotion?: PieceType
): GameState => {
  if (!isValidMove(gameState, from, to)) {
    throw new Error('Invalid move')
  }

  const newBoard = copyBoard(gameState.board)
  const piece = getPieceAt(newBoard, from)
  if (!piece) throw new Error('No piece at source position')

  const capturedPiece = getPieceAt(newBoard, to)
  const isCapture = !!capturedPiece

  // Handle castling
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    return makeCastlingMove(gameState, from, to)
  }

  // Handle en passant
  if (
    piece.type === 'pawn' &&
    gameState.enPassantTarget &&
    to.row === gameState.enPassantTarget.row &&
    to.col === gameState.enPassantTarget.col
  ) {
    // Verify there is an opponent pawn on the captured square
    // The captured pawn is on the same row as the capturing pawn, same file as en passant target
    const capturedPawnPos: Position = {
      row: from.row, // Same row as the capturing pawn
      col: gameState.enPassantTarget.col, // Same file as the en passant target
    }
    const capturedPiece = getPieceAt(newBoard, capturedPawnPos)
    
    if (
      capturedPiece &&
      capturedPiece.type === 'pawn' &&
      capturedPiece.color !== piece.color
    ) {
      return makeEnPassantMove(gameState, from, to)
    }
  }

  // Regular move
  newBoard[to.row][to.col] = { ...piece, hasMoved: true }
  newBoard[from.row][from.col] = null

  // Handle pawn promotion
  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    const promotedType = promotion || 'queen'
    newBoard[to.row][to.col] = { type: promotedType, color: piece.color, hasMoved: true }
  }

  // Update castling rights
  const newCastlingRights = { ...gameState.castlingRights }
  if (piece.type === 'king') {
    if (piece.color === 'white') {
      newCastlingRights.whiteKingSide = false
      newCastlingRights.whiteQueenSide = false
    } else {
      newCastlingRights.blackKingSide = false
      newCastlingRights.blackQueenSide = false
    }
  } else if (piece.type === 'rook') {
    // Only invalidate castling if the original castling rook moves from its starting square
    if (piece.color === 'white' && from.row === 7 && from.col === 0) {
      newCastlingRights.whiteQueenSide = false
    } else if (piece.color === 'white' && from.row === 7 && from.col === 7) {
      newCastlingRights.whiteKingSide = false
    } else if (piece.color === 'black' && from.row === 0 && from.col === 0) {
      newCastlingRights.blackQueenSide = false
    } else if (piece.color === 'black' && from.row === 0 && from.col === 7) {
      newCastlingRights.blackKingSide = false
    }
  }

  // Update en passant target
  let newEnPassantTarget: Position | null = null
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    newEnPassantTarget = { row: (from.row + to.row) / 2, col: from.col }
  }

  // Update half-move clock (reset on capture or pawn move)
  const newHalfMoveClock = isCapture || piece.type === 'pawn' ? 0 : gameState.halfMoveClock + 1

  // Update full move number
  const newFullMoveNumber =
    gameState.currentTurn === 'black' ? gameState.fullMoveNumber + 1 : gameState.fullMoveNumber

  // Create new move object
  const move: Move = {
    from,
    to,
    capturedPiece: capturedPiece || undefined,
    isCastling: piece.type === 'king' && Math.abs(to.col - from.col) === 2,
    isEnPassant: piece.type === 'pawn' && !!gameState.enPassantTarget && to.row === gameState.enPassantTarget.row && to.col === gameState.enPassantTarget.col,
    promotion: piece.type === 'pawn' && (to.row === 0 || to.row === 7) ? (promotion || 'queen') : undefined,
  }

  const newGameState: GameState = {
    board: newBoard,
    currentTurn: gameState.currentTurn === 'white' ? 'black' : 'white',
    castlingRights: newCastlingRights,
    enPassantTarget: newEnPassantTarget,
    halfMoveClock: newHalfMoveClock,
    fullMoveNumber: newFullMoveNumber,
    moveHistory: [...gameState.moveHistory, move],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
  }

  updateGameStatus(newGameState)
  return newGameState
}

/**
 * Execute a castling move (moves both king and rook)
 */
const makeCastlingMove = (gameState: GameState, kingFrom: Position, kingTo: Position): GameState => {
  const newBoard = copyBoard(gameState.board)
  const king = getPieceAt(newBoard, kingFrom)
  if (!king || king.type !== 'king') throw new Error('Invalid castling move')

  const color = king.color
  const row = color === 'white' ? 7 : 0

  // Determine rook positions
  let rookFrom: Position
  let rookTo: Position

  if (kingTo.col === 6) {
    // King-side castling
    rookFrom = { row, col: 7 }
    rookTo = { row, col: 5 }
  } else {
    // Queen-side castling
    rookFrom = { row, col: 0 }
    rookTo = { row, col: 3 }
  }

  const rook = getPieceAt(newBoard, rookFrom)
  if (!rook || rook.type !== 'rook') throw new Error('Invalid castling move')

  // Move king and rook
  newBoard[kingTo.row][kingTo.col] = { ...king, hasMoved: true }
  newBoard[kingFrom.row][kingFrom.col] = null
  newBoard[rookTo.row][rookTo.col] = { ...rook, hasMoved: true }
  newBoard[rookFrom.row][rookFrom.col] = null

  // Update castling rights
  const newCastlingRights = { ...gameState.castlingRights }
  if (color === 'white') {
    newCastlingRights.whiteKingSide = false
    newCastlingRights.whiteQueenSide = false
  } else {
    newCastlingRights.blackKingSide = false
    newCastlingRights.blackQueenSide = false
  }

  const move: Move = {
    from: kingFrom,
    to: kingTo,
    isCastling: true,
  }

  const newGameState: GameState = {
    board: newBoard,
    currentTurn: gameState.currentTurn === 'white' ? 'black' : 'white',
    castlingRights: newCastlingRights,
    enPassantTarget: null,
    halfMoveClock: gameState.halfMoveClock + 1,
    fullMoveNumber: gameState.currentTurn === 'black' ? gameState.fullMoveNumber + 1 : gameState.fullMoveNumber,
    moveHistory: [...gameState.moveHistory, move],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
  }

  updateGameStatus(newGameState)
  return newGameState
}

/**
 * Execute an en passant capture (captures pawn on adjacent square)
 */
const makeEnPassantMove = (gameState: GameState, pawnFrom: Position, pawnTo: Position): GameState => {
  const newBoard = copyBoard(gameState.board)
  const pawn = getPieceAt(newBoard, pawnFrom)
  if (!pawn || pawn.type !== 'pawn') throw new Error('Invalid en passant move')

  // Verify there is an opponent pawn on the captured square
  const direction = pawn.color === 'white' ? -1 : 1
  const capturedPawnPos: Position = { row: pawnTo.row - direction, col: pawnTo.col }
  const capturedPawn = getPieceAt(newBoard, capturedPawnPos)
  
  if (
    !capturedPawn ||
    capturedPawn.type !== 'pawn' ||
    capturedPawn.color === pawn.color
  ) {
    throw new Error('Invalid en passant move: no opponent pawn to capture')
  }

  // Move the pawn
  newBoard[pawnTo.row][pawnTo.col] = { ...pawn, hasMoved: true }
  newBoard[pawnFrom.row][pawnFrom.col] = null

  // Remove the captured pawn (behind the destination)
  newBoard[capturedPawnPos.row][capturedPawnPos.col] = null

  const move: Move = {
    from: pawnFrom,
    to: pawnTo,
    isEnPassant: true,
    capturedPiece: capturedPawn || undefined,
  }

  const newGameState: GameState = {
    board: newBoard,
    currentTurn: gameState.currentTurn === 'white' ? 'black' : 'white',
    castlingRights: gameState.castlingRights,
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: gameState.currentTurn === 'black' ? gameState.fullMoveNumber + 1 : gameState.fullMoveNumber,
    moveHistory: [...gameState.moveHistory, move],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
  }

  updateGameStatus(newGameState)
  return newGameState
}

// =============================================================================
// GAME STATUS DETECTION
// =============================================================================

/**
 * Check if a player has any legal moves available
 */
const hasAnyValidMoves = (gameState: GameState, color: Color): boolean => {
  // getValidMoves only returns moves for pieces of the currentTurn color
  // So we need to temporarily set the perspective to the color we're checking
  const perspectiveState =
    gameState.currentTurn === color ? gameState : { ...gameState, currentTurn: color }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = getPieceAt(gameState.board, { row, col })
      if (piece && piece.color === color) {
        const validMoves = getValidMoves(perspectiveState, { row, col })
        if (validMoves.length > 0) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Update game state with check, checkmate, and stalemate status
 * This is a helper to avoid code duplication across move functions
 */
const updateGameStatus = (gameState: GameState): void => {
  const nextTurnColor = gameState.currentTurn
  gameState.isCheck = isInCheck(gameState.board, nextTurnColor)

  const hasValidMoves = hasAnyValidMoves(gameState, nextTurnColor)
  if (gameState.isCheck && !hasValidMoves) {
    gameState.isCheckmate = true
  } else if (!gameState.isCheck && !hasValidMoves) {
    gameState.isStalemate = true
  }
}

/**
 * Check if the game is in checkmate for a given color
 *
 * Checkmate occurs when the king is in check and has no legal moves to escape.
 *
 * @param gameState - Current game state
 * @param color - Color to check for checkmate
 * @returns true if the specified color is in checkmate
 */
export const isCheckmate = (gameState: GameState, color: Color): boolean => {
  if (!isInCheck(gameState.board, color)) return false
  return !hasAnyValidMoves(gameState, color)
}

/**
 * Check if the game is in stalemate for a given color
 *
 * Stalemate occurs when a player has no legal moves but is not in check.
 *
 * @param gameState - Current game state
 * @param color - Color to check for stalemate
 * @returns true if the specified color is in stalemate
 */
export const isStalemate = (gameState: GameState, color: Color): boolean => {
  if (isInCheck(gameState.board, color)) return false
  return !hasAnyValidMoves(gameState, color)
}

// =============================================================================
// FEN NOTATION SUPPORT
// =============================================================================

const PIECE_TO_FEN: Record<string, string> = {
  'king-white': 'K',
  'queen-white': 'Q',
  'rook-white': 'R',
  'bishop-white': 'B',
  'knight-white': 'N',
  'pawn-white': 'P',
  'king-black': 'k',
  'queen-black': 'q',
  'rook-black': 'r',
  'bishop-black': 'b',
  'knight-black': 'n',
  'pawn-black': 'p',
}

const FEN_TO_PIECE: Record<string, { type: PieceType; color: Color }> = {
  K: { type: 'king', color: 'white' },
  Q: { type: 'queen', color: 'white' },
  R: { type: 'rook', color: 'white' },
  B: { type: 'bishop', color: 'white' },
  N: { type: 'knight', color: 'white' },
  P: { type: 'pawn', color: 'white' },
  k: { type: 'king', color: 'black' },
  q: { type: 'queen', color: 'black' },
  r: { type: 'rook', color: 'black' },
  b: { type: 'bishop', color: 'black' },
  n: { type: 'knight', color: 'black' },
  p: { type: 'pawn', color: 'black' },
}

/**
 * Convert a board to FEN piece placement string
 *
 * @param board - Chess board to convert
 * @returns FEN piece placement string (e.g., "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")
 */
export const boardToFen = (board: Board): string => {
  const ranks: string[] = []

  for (let row = 0; row < 8; row++) {
    let rank = ''
    let emptyCount = 0

    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece) {
        if (emptyCount > 0) {
          rank += emptyCount.toString()
          emptyCount = 0
        }
        rank += PIECE_TO_FEN[`${piece.type}-${piece.color}`]
      } else {
        emptyCount++
      }
    }

    if (emptyCount > 0) {
      rank += emptyCount.toString()
    }
    ranks.push(rank)
  }

  return ranks.join('/')
}

/**
 * Parse a FEN piece placement string to a board
 *
 * @param fen - FEN piece placement string (first part of full FEN)
 * @returns Chess board with pieces placed
 * @throws Error if FEN is invalid
 */
export const fenToBoard = (fen: string): Board => {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  const ranks = fen.split('/')
  if (ranks.length !== 8) {
    throw new Error('Invalid FEN: must have 8 ranks')
  }

  for (let row = 0; row < 8; row++) {
    let col = 0
    for (const char of ranks[row]) {
      if (char >= '1' && char <= '8') {
        col += parseInt(char, 10)
      } else {
        const pieceInfo = FEN_TO_PIECE[char]
        if (!pieceInfo) {
          throw new Error(`Invalid FEN: unknown piece '${char}'`)
        }
        // Determine if piece has moved based on position
        const hasMoved = !isStartingPosition(pieceInfo.type, pieceInfo.color, row, col)
        board[row][col] = { ...pieceInfo, hasMoved }
        col++
      }
    }
    if (col !== 8) {
      throw new Error('Invalid FEN: rank must have exactly 8 squares')
    }
  }

  return board
}

/**
 * Check if a piece is in its starting position
 */
const isStartingPosition = (type: PieceType, color: Color, row: number, col: number): boolean => {
  if (color === 'white') {
    if (type === 'pawn') return row === 6
    if (type === 'rook') return row === 7 && (col === 0 || col === 7)
    if (type === 'knight') return row === 7 && (col === 1 || col === 6)
    if (type === 'bishop') return row === 7 && (col === 2 || col === 5)
    if (type === 'queen') return row === 7 && col === 3
    if (type === 'king') return row === 7 && col === 4
  } else {
    if (type === 'pawn') return row === 1
    if (type === 'rook') return row === 0 && (col === 0 || col === 7)
    if (type === 'knight') return row === 0 && (col === 1 || col === 6)
    if (type === 'bishop') return row === 0 && (col === 2 || col === 5)
    if (type === 'queen') return row === 0 && col === 3
    if (type === 'king') return row === 0 && col === 4
  }
  return false
}

/**
 * Convert a complete game state to FEN notation
 *
 * FEN (Forsyth-Edwards Notation) is a standard notation for describing
 * chess positions. It includes piece positions, active color, castling
 * rights, en passant target, halfmove clock, and fullmove number.
 *
 * @param gameState - Game state to convert
 * @returns Full FEN string
 *
 * @example
 * gameStateToFen(initializeGameState())
 * // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 */
export const gameStateToFen = (gameState: GameState): string => {
  const parts: string[] = []

  // 1. Piece placement
  parts.push(boardToFen(gameState.board))

  // 2. Active color
  parts.push(gameState.currentTurn === 'white' ? 'w' : 'b')

  // 3. Castling availability
  let castling = ''
  if (gameState.castlingRights.whiteKingSide) castling += 'K'
  if (gameState.castlingRights.whiteQueenSide) castling += 'Q'
  if (gameState.castlingRights.blackKingSide) castling += 'k'
  if (gameState.castlingRights.blackQueenSide) castling += 'q'
  parts.push(castling || '-')

  // 4. En passant target square
  if (gameState.enPassantTarget) {
    parts.push(positionToSquare(gameState.enPassantTarget))
  } else {
    parts.push('-')
  }

  // 5. Halfmove clock
  parts.push(gameState.halfMoveClock.toString())

  // 6. Fullmove number
  parts.push(gameState.fullMoveNumber.toString())

  return parts.join(' ')
}

/**
 * Parse a FEN string into a complete game state
 *
 * @param fen - Full FEN string (at least 4 parts required)
 * @returns Complete game state with check/checkmate/stalemate computed
 * @throws Error if FEN is invalid
 *
 * @example
 * const gameState = fenToGameState("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")
 */
export const fenToGameState = (fen: string): GameState => {
  const parts = fen.trim().split(/\s+/)
  if (parts.length < 4) {
    throw new Error('Invalid FEN: must have at least 4 parts')
  }

  // 1. Piece placement
  const board = fenToBoard(parts[0])

  // 2. Active color
  const currentTurn: Color = parts[1] === 'w' ? 'white' : 'black'

  // 3. Castling availability
  const castlingStr = parts[2]
  const castlingRights = {
    whiteKingSide: castlingStr.includes('K'),
    whiteQueenSide: castlingStr.includes('Q'),
    blackKingSide: castlingStr.includes('k'),
    blackQueenSide: castlingStr.includes('q'),
  }

  // 4. En passant target square
  let enPassantTarget: Position | null = null
  if (parts[3] !== '-') {
    enPassantTarget = squareToPosition(parts[3])
  }

  // 5. Halfmove clock (optional)
  const halfMoveClock = parts[4] ? parseInt(parts[4], 10) : 0

  // 6. Fullmove number (optional)
  const fullMoveNumber = parts[5] ? parseInt(parts[5], 10) : 1

  const gameState: GameState = {
    board,
    currentTurn,
    castlingRights,
    enPassantTarget,
    halfMoveClock,
    fullMoveNumber,
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
  }

  // Update check/checkmate/stalemate status
  updateGameStatus(gameState)

  return gameState
}

/**
 * Standard starting position FEN
 */
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
