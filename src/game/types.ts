import type { PieceType } from '../data/pieceData'

export type Color = 'white' | 'black'

export interface Piece {
  type: PieceType
  color: Color
  hasMoved?: boolean // For castling and pawn first move
}

export type Square = Piece | null

export type Board = Square[][]

export interface Position {
  row: number // 0-7 (0 = rank 8, 7 = rank 1)
  col: number // 0-7 (0 = file a, 7 = file h)
}

export interface Move {
  from: Position
  to: Position
  promotion?: PieceType // For pawn promotion
  isCastling?: boolean
  isEnPassant?: boolean
  capturedPiece?: Piece
}

export interface CastlingRights {
  whiteKingSide: boolean
  whiteQueenSide: boolean
  blackKingSide: boolean
  blackQueenSide: boolean
}

export interface GameState {
  board: Board
  currentTurn: Color
  castlingRights: CastlingRights
  enPassantTarget: Position | null // Square behind pawn that can be captured en passant
  halfMoveClock: number // For 50-move rule
  fullMoveNumber: number
  moveHistory: Move[]
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
}

export type SquareNotation = string // e.g., "e4", "a8"
