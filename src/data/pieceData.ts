export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'

export interface PieceInfo {
  name: string
  title: string
  description: string
  movement: string[]
  specialRules?: string[]
  value: string
  // Movement pattern grid: 1 = can move, 2 = piece position, 0 = empty
  pattern: number[][]
}

export const pieceData: Record<PieceType, PieceInfo> = {
  king: {
    name: 'king',
    title: 'The King',
    description: 'The most important piece. If your King is checkmated, you lose the game.',
    movement: [
      'Moves one square in any direction',
      'Can castle with a rook under special conditions'
    ],
    specialRules: [
      'Cannot move into check',
      'Castling: Move 2 squares toward a rook, rook jumps to other side'
    ],
    value: 'Invaluable',
    pattern: [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ]
  },
  queen: {
    name: 'queen',
    title: 'The Queen',
    description: 'The most powerful piece on the board, combining the power of the rook and bishop.',
    movement: [
      'Moves any number of squares horizontally, vertically, or diagonally',
      'Cannot jump over other pieces'
    ],
    value: '9 points',
    pattern: [
      [1, 0, 1, 0, 1],
      [0, 1, 1, 1, 0],
      [1, 1, 2, 1, 1],
      [0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1]
    ]
  },
  rook: {
    name: 'rook',
    title: 'The Rook',
    description: 'A powerful piece that dominates open files and ranks.',
    movement: [
      'Moves any number of squares horizontally or vertically',
      'Cannot jump over other pieces'
    ],
    specialRules: [
      'Can castle with the King'
    ],
    value: '5 points',
    pattern: [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 2, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0]
    ]
  },
  bishop: {
    name: 'bishop',
    title: 'The Bishop',
    description: 'A long-range piece that controls diagonals. Each player has one light-squared and one dark-squared bishop.',
    movement: [
      'Moves any number of squares diagonally',
      'Cannot jump over other pieces',
      'Always stays on the same color square'
    ],
    value: '3 points',
    pattern: [
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0],
      [0, 0, 2, 0, 0],
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1]
    ]
  },
  knight: {
    name: 'knight',
    title: 'The Knight',
    description: 'The trickiest piece! It moves in an L-shape and is the only piece that can jump over others.',
    movement: [
      'Moves in an "L" shape: 2 squares in one direction, then 1 square perpendicular',
      'Can jump over other pieces'
    ],
    specialRules: [
      'The only piece that can jump over other pieces'
    ],
    value: '3 points',
    pattern: [
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1],
      [0, 0, 2, 0, 0],
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0]
    ]
  },
  pawn: {
    name: 'pawn',
    title: 'The Pawn',
    description: 'The soul of chess. Pawns may seem weak, but they can become any piece if they reach the other side!',
    movement: [
      'Moves forward one square (two squares on first move)',
      'Captures diagonally one square forward',
      'Cannot move backward'
    ],
    specialRules: [
      'Promotion: Becomes any piece (usually Queen) upon reaching the last rank',
      'En passant: Special capture of a pawn that just moved two squares'
    ],
    value: '1 point',
    pattern: [
      [1, 0, 1],
      [0, 1, 0],
      [0, 2, 0],
      [0, 0, 0]
    ]
  }
}

/**
 * Extract piece type from mesh name
 * Examples: "piece_knight_white_01" -> "knight"
 *           "piece_king_black" -> "king"
 */
export const getPieceTypeFromName = (meshName: string): PieceType | null => {
  const pieceTypes: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']
  
  for (const type of pieceTypes) {
    if (meshName.includes(type)) {
      return type
    }
  }
  
  return null
}

/**
 * Extract piece color from mesh name
 */
export const getPieceColorFromName = (meshName: string): 'white' | 'black' | null => {
  if (meshName.includes('white')) return 'white'
  if (meshName.includes('black')) return 'black'
  return null
}

