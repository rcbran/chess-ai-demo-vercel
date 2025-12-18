import { describe, it, expect } from 'vitest'
import {
  initializeBoard,
  initializeGameState,
  isValidMove,
  makeMove,
  getValidMoves,
  isInCheck,
  isCheckmate,
  isStalemate,
  squareToPosition,
  positionToSquare,
  getPieceAt,
  boardToFen,
  fenToBoard,
  gameStateToFen,
  fenToGameState,
  STARTING_FEN,
} from './chessEngine'
import { createTestPosition, createFromFen, pieceAt, TEST_POSITIONS } from './testUtils'
import type { Position } from './types'

describe('Chess Engine', () => {
  describe('Board Initialization', () => {
    it('should initialize board with correct starting position', () => {
      const board = initializeBoard()

      // Check white pieces
      expect(getPieceAt(board, { row: 7, col: 0 })).toEqual({
        type: 'rook',
        color: 'white',
        hasMoved: false,
      })
      expect(getPieceAt(board, { row: 7, col: 4 })).toEqual({
        type: 'king',
        color: 'white',
        hasMoved: false,
      })
      expect(getPieceAt(board, { row: 6, col: 0 })).toEqual({
        type: 'pawn',
        color: 'white',
        hasMoved: false,
      })

      // Check black pieces
      expect(getPieceAt(board, { row: 0, col: 0 })).toEqual({
        type: 'rook',
        color: 'black',
        hasMoved: false,
      })
      expect(getPieceAt(board, { row: 0, col: 4 })).toEqual({
        type: 'king',
        color: 'black',
        hasMoved: false,
      })
      expect(getPieceAt(board, { row: 1, col: 0 })).toEqual({
        type: 'pawn',
        color: 'black',
        hasMoved: false,
      })

      // Check empty squares
      expect(getPieceAt(board, { row: 4, col: 4 })).toBeNull()
    })

    it('should initialize game state correctly', () => {
      const gameState = initializeGameState()

      expect(gameState.currentTurn).toBe('white')
      expect(gameState.castlingRights.whiteKingSide).toBe(true)
      expect(gameState.castlingRights.whiteQueenSide).toBe(true)
      expect(gameState.castlingRights.blackKingSide).toBe(true)
      expect(gameState.castlingRights.blackQueenSide).toBe(true)
      expect(gameState.enPassantTarget).toBeNull()
      expect(gameState.halfMoveClock).toBe(0)
      expect(gameState.fullMoveNumber).toBe(1)
      expect(gameState.moveHistory).toEqual([])
      expect(gameState.isCheck).toBe(false)
      expect(gameState.isCheckmate).toBe(false)
      expect(gameState.isStalemate).toBe(false)
    })
  })

  describe('Square Notation Conversion', () => {
    it('should convert square notation to position', () => {
      expect(squareToPosition('e4')).toEqual({ row: 4, col: 4 })
      expect(squareToPosition('a1')).toEqual({ row: 7, col: 0 })
      expect(squareToPosition('h8')).toEqual({ row: 0, col: 7 })
      expect(squareToPosition('a8')).toEqual({ row: 0, col: 0 })
    })

    it('should convert position to square notation', () => {
      expect(positionToSquare({ row: 4, col: 4 })).toBe('e4')
      expect(positionToSquare({ row: 7, col: 0 })).toBe('a1')
      expect(positionToSquare({ row: 0, col: 7 })).toBe('h8')
      expect(positionToSquare({ row: 0, col: 0 })).toBe('a8')
    })
  })

  describe('Pawn Moves', () => {
    it('should allow pawn to move forward one square', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 6, col: 4 } // e2
      const to: Position = { row: 5, col: 4 } // e3

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should allow pawn to move forward two squares on first move', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 6, col: 4 } // e2
      const to: Position = { row: 4, col: 4 } // e4

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should only allow pawn two-square advance from starting rank before it has moved', () => {
      let gameState = initializeGameState()
      const from: Position = { row: 6, col: 4 } // e2
      const to: Position = { row: 4, col: 4 } // e4

      // Make first move
      gameState = makeMove(gameState, from, to)
      gameState = makeMove(gameState, { row: 1, col: 4 }, { row: 2, col: 4 }) // Black moves

      // Try to move another pawn two squares - should still be valid (different pawn, first move)
      const from2: Position = { row: 6, col: 3 } // d2
      const to2: Position = { row: 4, col: 3 } // d4

      expect(isValidMove(gameState, from2, to2)).toBe(true) // Still valid for different pawn

      // Move the pawn one square first
      gameState = makeMove(gameState, from2, { row: 5, col: 3 })
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 2, col: 3 }) // Black moves

      // Now try to move two squares - should fail (pawn has already moved)
      expect(isValidMove(gameState, { row: 5, col: 3 }, { row: 3, col: 3 })).toBe(false)
    })

    it('should allow pawn to capture diagonally', () => {
      let gameState = initializeGameState()
      // Move pawns to set up capture
      gameState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e4
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 3, col: 3 }) // d5

      const from: Position = { row: 4, col: 4 } // e4
      const to: Position = { row: 3, col: 3 } // d5

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should not allow pawn to move backward', () => {
      let gameState = initializeGameState()
      gameState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e4
      gameState = makeMove(gameState, { row: 1, col: 4 }, { row: 2, col: 4 }) // e5

      const from: Position = { row: 4, col: 4 } // e4
      const to: Position = { row: 5, col: 4 } // e3 (backward)

      expect(isValidMove(gameState, from, to)).toBe(false)
    })
  })

  describe('Knight Moves', () => {
    it('should allow knight to move in L-shape', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 7, col: 1 } // b1
      const to: Position = { row: 5, col: 2 } // c3

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should allow knight to jump over pieces', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 7, col: 1 } // b1
      const to: Position = { row: 5, col: 0 } // a3

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should not allow knight to move to invalid squares', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 7, col: 1 } // b1
      const to: Position = { row: 6, col: 1 } // b2 (not L-shape)

      expect(isValidMove(gameState, from, to)).toBe(false)
    })
  })

  describe('Bishop Moves', () => {
    it('should allow bishop to move diagonally', () => {
      let gameState = initializeGameState()
      // Clear path for bishop
      gameState = makeMove(gameState, { row: 6, col: 2 }, { row: 4, col: 2 }) // c4
      gameState = makeMove(gameState, { row: 1, col: 2 }, { row: 2, col: 2 }) // c5
      gameState = makeMove(gameState, { row: 6, col: 3 }, { row: 4, col: 3 }) // d4
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 2, col: 3 }) // d5

      const from: Position = { row: 7, col: 2 } // c1
      const to: Position = { row: 4, col: 5 } // f4

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should not allow bishop to move through pieces', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 7, col: 2 } // c1
      const to: Position = { row: 5, col: 4 } // e3 (blocked by pawn)

      expect(isValidMove(gameState, from, to)).toBe(false)
    })
  })

  describe('Rook Moves', () => {
    it('should allow rook to move horizontally and vertically', () => {
      let gameState = initializeGameState()
      // Clear path for rook
      gameState = makeMove(gameState, { row: 6, col: 0 }, { row: 4, col: 0 }) // a4
      gameState = makeMove(gameState, { row: 1, col: 0 }, { row: 2, col: 0 }) // a5

      const from: Position = { row: 7, col: 0 } // a1
      const to: Position = { row: 5, col: 0 } // a3

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should not allow rook to move through pieces', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 7, col: 0 } // a1
      const to: Position = { row: 5, col: 0 } // a3 (blocked by pawn)

      expect(isValidMove(gameState, from, to)).toBe(false)
    })
  })

  describe('Queen Moves', () => {
    it('should allow queen to move in all directions', () => {
      let gameState = initializeGameState()
      // Clear path for queen
      gameState = makeMove(gameState, { row: 6, col: 3 }, { row: 4, col: 3 }) // d4
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 2, col: 3 }) // d5
      gameState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e4
      gameState = makeMove(gameState, { row: 1, col: 4 }, { row: 2, col: 4 }) // e5

      const from: Position = { row: 7, col: 3 } // d1
      const to: Position = { row: 4, col: 6 } // g4

      expect(isValidMove(gameState, from, to)).toBe(true)
    })
  })

  describe('King Moves', () => {
    it('should allow king to move one square in any direction', () => {
      let gameState = initializeGameState()
      // Clear path for king - simple setup
      gameState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e4
      gameState = makeMove(gameState, { row: 1, col: 4 }, { row: 3, col: 4 }) // e5
      gameState = makeMove(gameState, { row: 6, col: 3 }, { row: 4, col: 3 }) // d4
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 3, col: 3 }) // d5
      gameState = makeMove(gameState, { row: 7, col: 1 }, { row: 5, col: 2 }) // Nc3
      gameState = makeMove(gameState, { row: 0, col: 1 }, { row: 2, col: 2 }) // Nc6

      const from: Position = { row: 7, col: 4 } // e1
      const to: Position = { row: 6, col: 4 } // e2

      expect(isValidMove(gameState, from, to)).toBe(true)
    })

    it('should not allow king to move into check', () => {
      // Create a position where the king would be in check if it moved to e2
      // White king at e1, black queen at e8 attacking e2
      const gameState = createTestPosition({
        pieces: [
          { square: 'e1', type: 'king', color: 'white', hasMoved: true },
          { square: 'e8', type: 'queen', color: 'black', hasMoved: true },
        ],
        currentTurn: 'white',
      })

      const from: Position = { row: 7, col: 4 } // e1
      const to: Position = { row: 6, col: 4 } // e2 (would be in check from queen)

      // Verify that moving to e2 is not a valid move (king would be in check)
      expect(isValidMove(gameState, from, to)).toBe(false)

      // Verify that e2 is not in the list of valid moves
      const validMoves = getValidMoves(gameState, from)
      const moveToE2 = validMoves.find((move) => move.row === to.row && move.col === to.col)
      expect(moveToE2).toBeUndefined()

      // Verify that other safe moves are still available
      expect(validMoves.length).toBeGreaterThan(0)
    })
  })

  describe('Check Detection', () => {
    it('should detect check', () => {
      let gameState = initializeGameState()
      // Simple check scenario - move queen to attack king
      gameState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e4
      gameState = makeMove(gameState, { row: 1, col: 4 }, { row: 3, col: 4 }) // e5
      gameState = makeMove(gameState, { row: 7, col: 3 }, { row: 3, col: 7 }) // Qh5
      gameState = makeMove(gameState, { row: 0, col: 6 }, { row: 2, col: 5 }) // Nf6
      gameState = makeMove(gameState, { row: 7, col: 5 }, { row: 4, col: 2 }) // Bc4
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 2, col: 3 }) // d6
      
      // Move queen to check the black king (Qxf7)
      gameState = makeMove(gameState, { row: 3, col: 7 }, { row: 1, col: 5 }) // Qxf7

      expect(isInCheck(gameState.board, 'black')).toBe(true)
      expect(gameState.isCheck).toBe(true)
    })

    it('should not allow moves that leave own king in check (pinned piece)', () => {
      // Set up a position where a piece is pinned to the king:
      // White king on e1, white bishop on e2, black rook on e8
      // The bishop on e2 is pinned - moving it would expose the king to the rook
      const gameState = createTestPosition({
        pieces: [
          { square: 'e1', type: 'king', color: 'white', hasMoved: true },
          { square: 'e2', type: 'bishop', color: 'white', hasMoved: true },
          { square: 'e8', type: 'rook', color: 'black', hasMoved: true },
          { square: 'a8', type: 'king', color: 'black', hasMoved: true },
        ],
        currentTurn: 'white',
      })

      // Bishop is pinned to the king by the rook
      const from: Position = { row: 6, col: 4 } // e2 (bishop)
      const to: Position = { row: 4, col: 2 } // c4 (diagonal move)

      // Moving the bishop should be invalid (exposes king to rook)
      expect(isValidMove(gameState, from, to)).toBe(false)

      // Verify the bishop has no valid moves (all moves would expose king)
      const validMoves = getValidMoves(gameState, from)
      expect(validMoves.length).toBe(0)
    })
  })

  describe('Castling', () => {
    it('should allow king-side castling when conditions are met', () => {
      // Set up board directly for castling test - cleaner than complex move sequences
      const gameState = initializeGameState()
      
      // Clear path for king-side castling (remove knight and bishop)
      gameState.board[7][5] = null // Remove bishop at f1
      gameState.board[7][6] = null // Remove knight at g1

      const from: Position = { row: 7, col: 4 } // e1
      const to: Position = { row: 7, col: 6 } // g1 (castling)

      // Check if castling is a valid move
      const validMoves = getValidMoves(gameState, from)
      const canCastle = validMoves.some(move => move.row === to.row && move.col === to.col)
      expect(canCastle).toBe(true)

      // Execute castling
      const newGameState = makeMove(gameState, from, to)

      // Check that king and rook moved
      expect(getPieceAt(newGameState.board, { row: 7, col: 6 })).toEqual({
        type: 'king',
        color: 'white',
        hasMoved: true,
      })
      expect(getPieceAt(newGameState.board, { row: 7, col: 5 })).toEqual({
        type: 'rook',
        color: 'white',
        hasMoved: true,
      })
      expect(getPieceAt(newGameState.board, { row: 7, col: 4 })).toBeNull()
      expect(getPieceAt(newGameState.board, { row: 7, col: 7 })).toBeNull()
    })

    it('should not allow castling if king has moved', () => {
      // Set up board directly - king has hasMoved: true
      const gameState = initializeGameState()
      
      // Clear path for king-side castling
      gameState.board[7][5] = null // Remove bishop at f1
      gameState.board[7][6] = null // Remove knight at g1
      
      // Mark king as having moved
      gameState.board[7][4] = { type: 'king', color: 'white', hasMoved: true }
      
      const from: Position = { row: 7, col: 4 } // e1
      const to: Position = { row: 7, col: 6 } // g1 (castling)

      // Castling should not be available because king has moved
      const validMoves = getValidMoves(gameState, from)
      const canCastle = validMoves.some(move => move.row === to.row && move.col === to.col)
      expect(canCastle).toBe(false)
      
      // Verify king has hasMoved flag set
      const king = getPieceAt(gameState.board, from)
      expect(king?.hasMoved).toBe(true)
    })

    it('should not allow castling if king is in check', () => {
      // Set up a position where white king is in check but castling path is clear:
      // White king on e1, white rook on h1, black queen on e8 giving check
      const gameState = createTestPosition({
        pieces: [
          { square: 'e1', type: 'king', color: 'white', hasMoved: false },
          { square: 'h1', type: 'rook', color: 'white', hasMoved: false },
          { square: 'e8', type: 'queen', color: 'black', hasMoved: true },
          { square: 'a8', type: 'king', color: 'black', hasMoved: true },
        ],
        currentTurn: 'white',
        castlingRights: {
          whiteKingSide: true,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false,
        },
      })

      const from: Position = { row: 7, col: 4 } // e1
      const to: Position = { row: 7, col: 6 } // g1 (king-side castle)

      // Assert the king IS in check (precondition)
      expect(isInCheck(gameState.board, 'white')).toBe(true)

      // Castling should not be allowed while in check
      expect(isValidMove(gameState, from, to)).toBe(false)

      // Also verify castling is not in valid moves list
      const validMoves = getValidMoves(gameState, from)
      const canCastle = validMoves.some((move) => move.row === to.row && move.col === to.col)
      expect(canCastle).toBe(false)
    })
  })

  describe('En Passant', () => {
    it('should allow en passant capture', () => {
      // Set up true en passant scenario using createTestPosition:
      // White pawn on e5, black pawn on d5, en passant target is d6
      // After black moves d7-d5 (two squares), en passant target is d6
      // White pawn on e5 can capture en passant to d6
      const gameState = createTestPosition({
        pieces: [
          { square: 'e5', type: 'pawn', color: 'white', hasMoved: true },
          { square: 'd5', type: 'pawn', color: 'black', hasMoved: true },
          { square: 'e1', type: 'king', color: 'white', hasMoved: true },
          { square: 'e8', type: 'king', color: 'black', hasMoved: true },
        ],
        currentTurn: 'white',
        enPassantTarget: 'd6', // En passant target after black moved d7-d5
      })

      // White pawn at e5 (row 3, col 4) can capture en passant to d6 (row 2, col 3)
      const from: Position = { row: 3, col: 4 } // e5
      const to: Position = { row: 2, col: 3 } // d6 (en passant target)

      expect(isValidMove(gameState, from, to)).toBe(true)

      // Execute en passant
      const newGameState = makeMove(gameState, from, to)

      // Check that white pawn moved to d6
      expect(getPieceAt(newGameState.board, { row: 2, col: 3 })).toEqual({
        type: 'pawn',
        color: 'white',
        hasMoved: true,
      })
      // Check that black pawn on d5 was captured (removed from d5)
      expect(getPieceAt(newGameState.board, { row: 3, col: 3 })).toBeNull() // Original black pawn position (d5)
    })
  })

  describe('Pawn Promotion', () => {
    it('should promote pawn when reaching last rank', () => {
      // Set up a minimal legal position with both kings and a pawn ready to promote
      const gameState = createTestPosition({
        pieces: [
          { square: 'e7', type: 'pawn', color: 'white', hasMoved: true },
          { square: 'e1', type: 'king', color: 'white', hasMoved: true },
          { square: 'a8', type: 'king', color: 'black', hasMoved: true },
        ],
        currentTurn: 'white',
      })

      const from: Position = { row: 1, col: 4 } // e7
      const to: Position = { row: 0, col: 4 } // e8

      expect(isValidMove(gameState, from, to)).toBe(true)

      // Execute promotion (defaults to queen)
      const newGameState = makeMove(gameState, from, to)

      // Check that pawn was promoted to queen
      expect(getPieceAt(newGameState.board, { row: 0, col: 4 })).toEqual({
        type: 'queen',
        color: 'white',
        hasMoved: true,
      })

      // Verify both kings are still present
      expect(getPieceAt(newGameState.board, { row: 7, col: 4 })?.type).toBe('king')
      expect(getPieceAt(newGameState.board, { row: 0, col: 0 })?.type).toBe('king')
    })
  })

  describe('Checkmate Detection', () => {
    it('should detect checkmate', () => {
      // Use test utilities for cleaner setup
      const gameState = createTestPosition({
        pieces: [
          { square: 'e8', type: 'king', color: 'black', hasMoved: true },
          { square: 'e7', type: 'queen', color: 'white', hasMoved: true },
          { square: 'd8', type: 'queen', color: 'white', hasMoved: true },
          { square: 'e1', type: 'king', color: 'white', hasMoved: true },
        ],
        currentTurn: 'black',
        castlingRights: {
          whiteKingSide: false,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false,
        },
      })

      // Black king is in check and has no valid moves
      expect(isInCheck(gameState.board, 'black')).toBe(true)
      expect(isCheckmate(gameState, 'black')).toBe(true)
    })

    it('should detect checkmate from FEN position', () => {
      // Scholar's mate position
      const gameState = createFromFen(TEST_POSITIONS.SCHOLARS_MATE)
      
      expect(isInCheck(gameState.board, 'black')).toBe(true)
      expect(isCheckmate(gameState, 'black')).toBe(true)
    })
  })

  describe('Move Execution', () => {
    it('should update board state after move', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 6, col: 4 } // e2
      const to: Position = { row: 4, col: 4 } // e4

      const newGameState = makeMove(gameState, from, to)

      expect(getPieceAt(newGameState.board, to)).toEqual({
        type: 'pawn',
        color: 'white',
        hasMoved: true,
      })
      expect(getPieceAt(newGameState.board, from)).toBeNull()
    })

    it('should switch turn after move', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 6, col: 4 } // e2
      const to: Position = { row: 4, col: 4 } // e4

      const newGameState = makeMove(gameState, from, to)

      expect(newGameState.currentTurn).toBe('black')
    })

    it('should update move history', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 6, col: 4 } // e2
      const to: Position = { row: 4, col: 4 } // e4

      const newGameState = makeMove(gameState, from, to)

      expect(newGameState.moveHistory).toHaveLength(1)
      expect(newGameState.moveHistory[0].from).toEqual(from)
      expect(newGameState.moveHistory[0].to).toEqual(to)
    })
  })

  describe('Get Valid Moves', () => {
    it('should return valid moves for a piece', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 7, col: 1 } // b1 (knight)

      const validMoves = getValidMoves(gameState, from)

      expect(validMoves.length).toBeGreaterThan(0)
      // Knight from b1 should be able to move to c3, a3, d2
      expect(validMoves.some((move) => move.row === 5 && move.col === 2)).toBe(true) // c3
    })

    it('should return empty array for invalid piece', () => {
      const gameState = initializeGameState()
      const from: Position = { row: 4, col: 4 } // e4 (empty square)

      const validMoves = getValidMoves(gameState, from)

      expect(validMoves).toEqual([])
    })

    it('should not return moves that leave king in check', () => {
      let gameState = initializeGameState()
      // Set up a position where a move would leave king in check
      gameState = makeMove(gameState, { row: 6, col: 4 }, { row: 4, col: 4 }) // e4
      gameState = makeMove(gameState, { row: 1, col: 3 }, { row: 3, col: 3 }) // d5
      gameState = makeMove(gameState, { row: 7, col: 3 }, { row: 4, col: 6 }) // Qg4

      // Get valid moves for a piece that, if moved, would expose the king
      // This is complex to set up, but the logic should filter out such moves
      const validMoves = getValidMoves(gameState, { row: 7, col: 4 }) // e1 (king)
      // All returned moves should be valid (not leave king in check)
      for (const move of validMoves) {
        const testGameState = makeMove(gameState, { row: 7, col: 4 }, move)
        expect(isInCheck(testGameState.board, 'white')).toBe(false)
      }
    })
  })

  describe('FEN Notation', () => {
    it('should convert starting position to correct FEN', () => {
      const board = initializeBoard()
      const fen = boardToFen(board)
      
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
    })

    it('should parse starting FEN to correct board', () => {
      const board = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
      
      // Check some pieces
      expect(board[0][0]?.type).toBe('rook')
      expect(board[0][0]?.color).toBe('black')
      expect(board[7][4]?.type).toBe('king')
      expect(board[7][4]?.color).toBe('white')
      expect(board[4][4]).toBeNull() // Empty square
    })

    it('should convert game state to full FEN and back', () => {
      const gameState = initializeGameState()
      const fen = gameStateToFen(gameState)
      
      expect(fen).toBe(STARTING_FEN)
      
      // Parse it back
      const parsed = fenToGameState(fen)
      expect(parsed.currentTurn).toBe('white')
      expect(parsed.castlingRights.whiteKingSide).toBe(true)
      expect(parsed.castlingRights.blackQueenSide).toBe(true)
      expect(parsed.enPassantTarget).toBeNull()
    })

    it('should handle FEN with en passant target', () => {
      // After 1.e4, the en passant target should be e3
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      const gameState = fenToGameState(fen)
      
      expect(gameState.enPassantTarget).toEqual({ row: 5, col: 4 }) // e3
      expect(gameState.currentTurn).toBe('black')
    })

    it('should handle FEN with partial castling rights', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Kq - 0 1'
      const gameState = fenToGameState(fen)
      
      expect(gameState.castlingRights.whiteKingSide).toBe(true)
      expect(gameState.castlingRights.whiteQueenSide).toBe(false)
      expect(gameState.castlingRights.blackKingSide).toBe(false)
      expect(gameState.castlingRights.blackQueenSide).toBe(true)
    })

    it('should round-trip a complex position', () => {
      const originalFen = TEST_POSITIONS.ITALIAN_GAME
      const gameState = fenToGameState(originalFen)
      const roundTripped = gameStateToFen(gameState)
      
      expect(roundTripped).toBe(originalFen)
    })
  })

  describe('Test Utilities', () => {
    it('should create position with createTestPosition', () => {
      const gameState = createTestPosition({
        pieces: [
          { square: 'e1', type: 'king', color: 'white' },
          { square: 'e8', type: 'king', color: 'black' },
          { square: 'd4', type: 'queen', color: 'white' },
        ],
        currentTurn: 'white',
      })

      expect(pieceAt(gameState, 'e1')?.type).toBe('king')
      expect(pieceAt(gameState, 'e8')?.type).toBe('king')
      expect(pieceAt(gameState, 'd4')?.type).toBe('queen')
      expect(pieceAt(gameState, 'a1')).toBeNull()
    })

    it('should create position from FEN', () => {
      const gameState = createFromFen(TEST_POSITIONS.KINGS_ONLY)
      
      expect(pieceAt(gameState, 'e8')?.type).toBe('king')
      expect(pieceAt(gameState, 'e8')?.color).toBe('black')
      expect(pieceAt(gameState, 'e1')?.type).toBe('king')
      expect(pieceAt(gameState, 'e1')?.color).toBe('white')
    })

    it('should detect stalemate from test position', () => {
      const gameState = createFromFen(TEST_POSITIONS.STALEMATE)
      
      expect(gameState.currentTurn).toBe('black')
      expect(isInCheck(gameState.board, 'black')).toBe(false)
      expect(isStalemate(gameState, 'black')).toBe(true)
    })
  })
})

