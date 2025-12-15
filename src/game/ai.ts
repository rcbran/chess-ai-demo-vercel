/**
 * Stockfish AI Service
 * 
 * Wraps the Stockfish WebAssembly chess engine in a clean async interface.
 * Uses Web Worker to run calculations off the main thread.
 */

import type { Position } from './types'
import { squareToPosition } from './chessEngine'

export interface AIMove {
  from: Position
  to: Position
  promotion?: 'q' | 'r' | 'b' | 'n'
}

export interface AIConfig {
  depth?: number          // Search depth (1-20+), higher = stronger
  skillLevel?: number     // 0-20, affects move quality
}

// Default: Strong but responsive
const DEFAULT_CONFIG: AIConfig = {
  depth: 15,
  skillLevel: 20,
}

/**
 * Stockfish AI wrapper
 * 
 * Uses the stockfish npm package which provides WebAssembly builds.
 * Runs in a Web Worker to avoid blocking the main thread.
 */
export class StockfishAI {
  private worker: Worker | null = null
  private isReady = false
  private messageHandler: ((data: string) => void) | null = null
  private config: AIConfig = DEFAULT_CONFIG

  /**
   * Initialize the Stockfish engine
   */
  async initialize(config?: AIConfig): Promise<void> {
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config }
    }

    return new Promise((resolve, reject) => {
      try {
        // Load the single-threaded lite version (works without CORS headers)
        // This is the recommended version for simpler deployment
        const workerUrl = new URL(
          'stockfish/src/stockfish-17.1-lite-single-03e3232.js',
          import.meta.url
        )
        
        this.worker = new Worker(workerUrl, { type: 'module' })
        
        let initialized = false
        let ready = false
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        // Timeout after 30 seconds
        timeoutId = setTimeout(() => {
          if (!this.isReady) {
            this.worker?.terminate()
            this.worker = null
            timeoutId = null
            reject(new Error('Stockfish initialization timeout'))
          }
        }, 30000)

        this.worker.onmessage = (e: MessageEvent) => {
          const message = typeof e.data === 'string' ? e.data : String(e.data)
          
          // Handle initialization sequence
          if (message === 'uciok' && !initialized) {
            initialized = true
            // Set skill level
            this.worker?.postMessage(`setoption name Skill Level value ${this.config.skillLevel}`)
            this.worker?.postMessage('isready')
            return
          }
          
          if (message === 'readyok' && !ready) {
            ready = true
            this.isReady = true
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            resolve()
            return
          }
          
          // Forward to message handler for move calculation
          if (this.messageHandler) {
            this.messageHandler(message)
          }
        }

        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error)
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          reject(error)
        }

        // Start UCI initialization
        this.worker.postMessage('uci')
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Calculate the best move for the given position
   * 
   * @param fen - FEN string representing the current position
   * @param config - Optional config overrides for this move
   * @returns The best move, or null if no move found
   */
  async calculateMove(fen: string, config?: Partial<AIConfig>): Promise<AIMove | null> {
    if (!this.worker || !this.isReady) {
      throw new Error('Stockfish not initialized')
    }

    // Guard against concurrent calls
    if (this.messageHandler) {
      throw new Error('AI move already in progress')
    }

    const moveConfig = { ...this.config, ...config }

    return new Promise((resolve, reject) => {
      // Handle worker errors during move calculation
      const worker = this.worker!
      
      // Define cleanup and errorHandler before timeout so they're in scope
      const cleanup = () => {
        clearTimeout(timeoutId)
        this.messageHandler = null
        worker.removeEventListener('error', errorHandler)
      }
      
      const errorHandler = (_error: ErrorEvent) => {
        cleanup()
        reject(new Error('Worker error during move calculation'))
      }

      // Timeout after 30 seconds
      const timeoutId = setTimeout(() => {
        // Stop the engine search to prevent stale bestmove from being misinterpreted
        this.stop()
        cleanup()
        reject(new Error('AI move calculation timeout'))
      }, 30000)

      worker.addEventListener('error', errorHandler)

      this.messageHandler = (message) => {
        // Parse bestmove response
        // Format: "bestmove e2e4" or "bestmove e7e8q" (with promotion)
        const match = message.match(/^bestmove\s+(\w+)/)
        if (match) {
          const moveStr = match[1]
          
          if (moveStr === '(none)') {
            // No legal moves (checkmate or stalemate)
            cleanup()
            resolve(null)
            return
          }
          
          const fromSquare = moveStr.slice(0, 2)
          const toSquare = moveStr.slice(2, 4)
          const promotionChar = moveStr[4] as 'q' | 'r' | 'b' | 'n' | undefined
          
          const from = squareToPosition(fromSquare)
          const to = squareToPosition(toSquare)
          
          // Validate position values (check for NaN and bounds)
          if (
            !Number.isFinite(from.row) || !Number.isFinite(from.col) ||
            !Number.isFinite(to.row) || !Number.isFinite(to.col) ||
            from.row < 0 || from.row > 7 || from.col < 0 || from.col > 7 ||
            to.row < 0 || to.row > 7 || to.col < 0 || to.col > 7
          ) {
            console.error('Failed to parse AI move:', moveStr)
            cleanup()
            resolve(null)
            return
          }
          
          cleanup()
          resolve({
            from,
            to,
            promotion: promotionChar,
          })
        }
      }

      // Send position and calculate
      this.worker!.postMessage(`position fen ${fen}`)
      this.worker!.postMessage(`go depth ${moveConfig.depth}`)
    })
  }

  /**
   * Stop any ongoing calculation
   */
  stop(): void {
    if (this.worker && this.isReady) {
      this.worker.postMessage('stop')
    }
  }

  /**
   * Start a new game (clears engine state)
   */
  newGame(): void {
    if (this.worker && this.isReady) {
      this.worker.postMessage('ucinewgame')
    }
  }

  /**
   * Terminate the engine
   */
  terminate(): void {
    if (this.worker) {
      this.stop()
      this.worker.terminate()
      this.worker = null
      this.isReady = false
      this.messageHandler = null
    }
  }

  /**
   * Check if the engine is ready
   */
  get ready(): boolean {
    return this.isReady
  }
}

// Singleton instance for convenience
let initPromise: Promise<StockfishAI> | null = null

export const getStockfishAI = async (config?: AIConfig): Promise<StockfishAI> => {
  if (!initPromise) {
    initPromise = (async () => {
      const instance = new StockfishAI()
      try {
        await instance.initialize(config)
        return instance
      } catch (error) {
        // Reset promise on failure so retry is possible
        initPromise = null
        throw error
      }
    })()
  }
  return initPromise
}

export const terminateStockfishAI = async (): Promise<void> => {
  if (initPromise) {
    try {
      const instance = await initPromise
      instance.terminate()
    } catch {
      // Ignore - initialization failed
    } finally {
      initPromise = null
    }
  }
}

