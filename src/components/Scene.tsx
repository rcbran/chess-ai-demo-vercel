import { useRef, useEffect, useMemo, useCallback, useState, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import { Color as ThreeColor, MeshStandardMaterial, type Group, type Mesh, type Object3D, type Material, Vector3 } from 'three'
import { getPieceTypeFromName, getPieceColorFromName, type PieceType } from '../data/pieceData'
import type { Color, GameState, Position } from '../game/types'
import { MoveIndicator } from './MoveIndicator'
import { worldPositionToPosition, getMeshInitialSquare, parseMeshName } from '../game/boardMapping'
import { squareToPosition, getPieceAt } from '../game/chessEngine'

interface SceneProps {
  onPieceClick: (pieceType: PieceType, color: 'white' | 'black', meshName: string, screenX: number) => void
  onPieceHover: (meshName: string | null) => void
  onBoardClick: () => void
  selectedPiece: string | null
  hoveredPiece: string | null
  gameMode?: 'demo' | 'play'
  playerColor?: Color | null
  // Play mode props
  gameState?: GameState | null
  selectedSquare?: Position | null
  validMoves?: Position[]
  onSquareClick?: (position: Position) => void
}

// Camera positions for each player perspective
// White player sits behind rank 1 (negative Z), looking toward rank 8
// Black player sits behind rank 8 (positive Z), looking toward rank 1
// Higher Y value (0.5) and reduced Z (0.45) for more overhead angle - ensures all pieces are clickable
const CAMERA_CONFIG = {
  white: {
    position: new Vector3(0, 0.5, -0.45),
    target: new Vector3(0, 0, 0),
  },
  black: {
    position: new Vector3(0, 0.5, 0.45),
    target: new Vector3(0, 0, 0),
  },
}

// OrbitControls limits for play mode
const PLAY_MODE_LIMITS = {
  rotationRange: Math.PI / 7.2,    // ~25 degrees of freedom in any direction
  minDistance: 0.3,
  maxDistance: 1.0,
}

// Store original materials for each mesh
const originalMaterials = new Map<string, Material | Material[]>()

export const Scene = ({ 
  onPieceClick, 
  onPieceHover, 
  onBoardClick, 
  selectedPiece, 
  hoveredPiece, 
  gameMode = 'demo', 
  playerColor,
  gameState,
  selectedSquare,
  validMoves = [],
  onSquareClick
}: SceneProps) => {
  const groupRef = useRef<Group>(null)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  
  // Track current positions of all pieces (mesh name → current Position)
  // At game start, pieces are at their initial positions
  const pieceSquares = useRef<Map<string, Position>>(new Map())
  
  // Get camera from Three.js context for play mode positioning
  const { camera } = useThree()
  
  // Load the chess model
  const { scene } = useGLTF('/models/chess_set_4k.gltf')
  
  // Get the Three.js state for pointer cursor
  const { gl } = useThree()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isHoveringPiece, setIsHoveringPiece] = useState(false)
  
  // Store canvas element reference
  useEffect(() => {
    canvasRef.current = gl.domElement
  }, [gl.domElement])
  
  // Update cursor style based on hover state
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = isHoveringPiece ? 'pointer' : 'auto'
    }
  }, [isHoveringPiece])
  
  // Clone the scene to avoid modifying the cached original
  const clonedScene = useMemo(() => scene.clone(), [scene])
  
  // Track which meshes are pieces
  const pieceMeshes = useMemo(() => {
    const pieces: Map<string, Object3D> = new Map()
    
    clonedScene.traverse((child) => {
      if (child.name.startsWith('piece_')) {
        pieces.set(child.name, child)
        
        // Store original materials
        child.traverse((subChild) => {
          const mesh = subChild as Mesh
          if (mesh.isMesh && mesh.material) {
            if (!originalMaterials.has(mesh.uuid)) {
              // Clone the material so we have a true original
              if (Array.isArray(mesh.material)) {
                originalMaterials.set(mesh.uuid, mesh.material.map(m => m.clone()))
              } else {
                originalMaterials.set(mesh.uuid, mesh.material.clone())
              }
            }
          }
        })
      }
    })
    
    return pieces
  }, [clonedScene])

  // Create highlight material
  const createHighlightMaterial = useCallback((originalMat: Material, color: ThreeColor): Material => {
    const mat = originalMat.clone() as MeshStandardMaterial
    mat.emissive = color
    mat.emissiveIntensity = 1.5
    return mat
  }, [])

  // Apply highlight effect to a piece
  const setHighlight = useCallback((pieceName: string | null, color: ThreeColor | null) => {
    pieceMeshes.forEach((pieceObj, name) => {
      const isTarget = name === pieceName
      
      pieceObj.traverse((child) => {
        const mesh = child as Mesh
        if (mesh.isMesh && mesh.material) {
          const originalMat = originalMaterials.get(mesh.uuid)
          
          if (isTarget && color && originalMat) {
            // Apply highlight by replacing with highlighted material
            if (Array.isArray(originalMat)) {
              mesh.material = originalMat.map(m => createHighlightMaterial(m, color))
            } else {
              mesh.material = createHighlightMaterial(originalMat, color)
            }
          } else if (originalMat) {
            // Restore original material
            if (Array.isArray(originalMat)) {
              mesh.material = originalMat.map(m => m.clone())
            } else {
              mesh.material = originalMat.clone()
            }
          }
        }
      })
    })
  }, [pieceMeshes, createHighlightMaterial])

  // Helper function to update piece position when a move is executed
  // This will be called from move execution code in Feature 6
  // @ts-expect-error - Intentionally unused until Feature 6
  const _updatePiecePosition = useCallback((meshName: string, _from: Position, to: Position, capturedMeshName?: string | null) => {
    // Update the moving piece's position
    pieceSquares.current.set(meshName, to)
    
    // Remove captured piece if provided
    if (capturedMeshName) {
      pieceSquares.current.delete(capturedMeshName)
    }
  }, [])

  // Rebuild pieceSquares from gameState.board by matching pieces to meshes
  const rebuildPieceSquares = useCallback(() => {
    if (!gameState || gameMode !== 'play') return
    
    // Create a map of available meshes by type/color
    const availableMeshesByType = new Map<string, string[]>()
    pieceMeshes.forEach((_, meshName) => {
      const parsed = parseMeshName(meshName)
      if (!parsed) return
      
      const key = `${parsed.type}-${parsed.color}`
      if (!availableMeshesByType.has(key)) {
        availableMeshesByType.set(key, [])
      }
      availableMeshesByType.get(key)!.push(meshName)
    })
    
    // Track which meshes we've already assigned
    const assignedMeshes = new Set<string>()
    
    // Get current pieceSquares to use as hints for stable matching
    const currentPositions = new Map<string, Position>()
    pieceSquares.current.forEach((pos, meshName) => {
      currentPositions.set(meshName, pos)
    })
    
    // First pass: try to keep meshes at their current positions (stable matching)
    for (const [meshName, currentPos] of currentPositions.entries()) {
      const piece = getPieceAt(gameState.board, currentPos)
      const parsed = parseMeshName(meshName)
      if (piece && parsed && piece.type === parsed.type && piece.color === parsed.color) {
        // This mesh is still at this position - keep it
        pieceSquares.current.set(meshName, currentPos)
        assignedMeshes.add(meshName)
      }
    }
    
    // Second pass: assign remaining pieces to remaining meshes
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = getPieceAt(gameState.board, { row, col })
        if (!piece) continue
        
        // Check if this position already has a mesh assigned
        let alreadyAssigned = false
        for (const [, pos] of pieceSquares.current.entries()) {
          if (pos.row === row && pos.col === col) {
            alreadyAssigned = true
            break
          }
        }
        if (alreadyAssigned) continue
        
        // Find an available mesh of matching type/color
        const key = `${piece.type}-${piece.color}`
        const availableMeshes = availableMeshesByType.get(key) || []
        
        for (const meshName of availableMeshes) {
          if (!assignedMeshes.has(meshName)) {
            pieceSquares.current.set(meshName, { row, col })
            assignedMeshes.add(meshName)
            break
          }
        }
      }
    }
    
    // Third pass: remove meshes for pieces that are no longer on the board
    for (const [meshName, pos] of Array.from(pieceSquares.current.entries())) {
      const pieceAtPos = getPieceAt(gameState.board, pos)
      const parsed = parseMeshName(meshName)
      if (!pieceAtPos || !parsed || pieceAtPos.type !== parsed.type || pieceAtPos.color !== parsed.color) {
        pieceSquares.current.delete(meshName)
      }
    }
  }, [gameState, gameMode, pieceMeshes])

  // Initialize piece positions when entering play mode
  useEffect(() => {
    if (gameMode === 'play' && gameState) {
      // If no moves have been made, use initial positions
      if (gameState.moveHistory.length === 0) {
        pieceSquares.current.clear()
        pieceMeshes.forEach((_, meshName) => {
          const square = getMeshInitialSquare(meshName)
          if (square) {
            pieceSquares.current.set(meshName, squareToPosition(square))
          }
        })
      } else {
        // Rebuild from current board state
        rebuildPieceSquares()
      }
    }
  }, [gameMode, gameState, pieceMeshes, rebuildPieceSquares])

  // Sync pieceSquares when board changes (watch moveHistory length as proxy)
  useEffect(() => {
    if (gameMode === 'play' && gameState && gameState.moveHistory.length > 0) {
      rebuildPieceSquares()
    }
  }, [gameMode, gameState, rebuildPieceSquares])

  // Get the mesh name for a piece at a given position
  const getMeshAtPosition = useCallback((position: Position): string | null => {
    for (const [meshName, pos] of pieceSquares.current.entries()) {
      if (pos.row === position.row && pos.col === position.col) {
        return meshName
      }
    }
    return null
  }, [])

  // Update highlights when hover/selection changes
  useEffect(() => {
    // In play mode, highlight based on selectedSquare
    if (gameMode === 'play' && selectedSquare) {
      const meshName = getMeshAtPosition(selectedSquare)
      if (meshName) {
        setHighlight(meshName, new ThreeColor(0x00ff00)) // Bright green for selected
      } else {
        // If mesh lookup fails, reset highlight to avoid stuck highlights
        setHighlight(null, null)
      }
    } else if (selectedPiece) {
      setHighlight(selectedPiece, new ThreeColor(0x00ff00)) // Bright green for selected
    } else if (hoveredPiece) {
      // Hover highlighting works in both demo and play modes
      setHighlight(hoveredPiece, new ThreeColor(0x00aaff)) // Bright blue for hover
    } else {
      setHighlight(null, null) // Reset all
    }
  }, [selectedPiece, hoveredPiece, selectedSquare, gameMode, getMeshAtPosition, setHighlight])

  // Handle click on scene objects
  const handleClick = (event: { stopPropagation: () => void; object: Object3D; pointer: { x: number }; point: Vector3 }) => {
    event.stopPropagation()
    
    const clickedObject = event.object as Object3D
    
    // PLAY MODE: Handle piece selection and move targeting
    if (gameMode === 'play' && onSquareClick) {
      // Get the clicked position in world coordinates and convert to board position
      const clickPoint = event.point
      const position = worldPositionToPosition(clickPoint.x, clickPoint.z)
      
      if (position) {
        onSquareClick(position)
      }
      return
    }
    
    // DEMO MODE: Original behavior
    // Check if clicked on the board
    if (clickedObject.name === 'board') {
      onBoardClick()
      return
    }
    
    // Check if clicked on a piece
    let target = clickedObject
    while (target && !target.name.startsWith('piece_')) {
      target = target.parent as Object3D
    }
    
    if (target && target.name.startsWith('piece_')) {
      const pieceType = getPieceTypeFromName(target.name)
      const pieceColor = getPieceColorFromName(target.name)
      
      if (pieceType && pieceColor) {
        // Get the screen X position from the pointer event
        const screenX = event.pointer.x // Normalized -1 to 1
        onPieceClick(pieceType, pieceColor, target.name, screenX)
      }
    }
  }

  // Handle pointer over/out for cursor and hover highlight
  const handlePointerOver = (event: { stopPropagation: () => void; object: Object3D }) => {
    event.stopPropagation()
    let target = event.object as Object3D
    while (target && !target.name.startsWith('piece_')) {
      target = target.parent as Object3D
    }
    
    if (target && target.name.startsWith('piece_')) {
      // In play mode, only allow hover on player's own pieces
      if (gameMode === 'play' && playerColor) {
        const pieceColor = getPieceColorFromName(target.name)
        if (pieceColor === playerColor) {
          setIsHoveringPiece(true)
          onPieceHover(target.name)
        }
      } else {
        // Demo mode: allow hover on all pieces
        setIsHoveringPiece(true)
        onPieceHover(target.name)
      }
    }
  }

  const handlePointerOut = () => {
    setIsHoveringPiece(false)
    onPieceHover(null)
  }

  // Control auto-rotate based on selection, hover, and game mode
  useEffect(() => {
    if (controlsRef.current) {
      // Disable auto-rotate in play mode or when piece is selected
      const shouldAutoRotate = gameMode === 'demo' && selectedPiece === null
      controlsRef.current.autoRotate = shouldAutoRotate
      
      // Slow down rotation when hovering (only relevant in demo mode)
      if (gameMode === 'demo') {
        if (hoveredPiece && !selectedPiece) {
          controlsRef.current.autoRotateSpeed = 0.05
        } else {
          controlsRef.current.autoRotateSpeed = 0.25
        }
      }
    }
  }, [selectedPiece, hoveredPiece, gameMode])

  // Camera locking for play mode
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    
    let animationFrameId: number | null = null

    if (gameMode === 'play' && playerColor) {
      // Get target camera config based on player color
      const config = CAMERA_CONFIG[playerColor]
      
      // Animate camera to the target position
      const startPosition = camera.position.clone()
      const endPosition = config.position.clone()
      const duration = 800 // ms
      const startTime = Date.now()

      const animateCamera = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3)
        
        camera.position.lerpVectors(startPosition, endPosition, eased)
        controls.target.copy(config.target)
        controls.update()

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateCamera)
        } else {
          // Animation complete - apply play mode limits relative to final position
          const polarAngle = controls.getPolarAngle()
          const azimuthAngle = controls.getAzimuthalAngle()
          const range = PLAY_MODE_LIMITS.rotationRange
          
          // Set limits as ±25° from current position
          controls.minPolarAngle = Math.max(0.1, polarAngle - range)
          controls.maxPolarAngle = Math.min(Math.PI / 2, polarAngle + range)
          controls.minAzimuthAngle = azimuthAngle - range
          controls.maxAzimuthAngle = azimuthAngle + range
          controls.minDistance = PLAY_MODE_LIMITS.minDistance
          controls.maxDistance = PLAY_MODE_LIMITS.maxDistance
          controls.enablePan = false
          controls.update()
        }
      }

      animateCamera()
    } else if (gameMode === 'demo') {
      // Reset to demo mode - remove all restrictions
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI
      controls.minAzimuthAngle = -Infinity
      controls.maxAzimuthAngle = Infinity
      controls.minDistance = 0
      controls.maxDistance = Infinity
      controls.enablePan = true
      controls.update()
    }
    
    // Cleanup: cancel animation frame if effect re-runs or component unmounts
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [gameMode, playerColor, camera])

  // Calculate capture positions (valid moves where there's an opponent piece or en passant)
  const capturePositions = useMemo(() => {
    if (!gameState || validMoves.length === 0) return []
    return validMoves.filter(pos => {
      // Check if there's a piece at the destination (regular capture)
      const piece = getPieceAt(gameState.board, pos)
      if (piece !== null) return true
      
      // Check if this is an en passant capture (lands on empty enPassantTarget square)
      if (gameState.enPassantTarget &&
          pos.row === gameState.enPassantTarget.row &&
          pos.col === gameState.enPassantTarget.col) {
        return true
      }
      
      return false
    })
  }, [gameState, validMoves])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 15, 10]} 
        intensity={1.2} 
        castShadow 
      />
      <directionalLight 
        position={[-10, 10, -10]} 
        intensity={0.4} 
      />
      
      {/* Chess board model with click handling */}
      <primitive 
        ref={groupRef}
        object={clonedScene} 
        scale={1} 
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      
      {/* Move indicators - show valid moves in play mode */}
      {gameMode === 'play' && validMoves.length > 0 && (
        <MoveIndicator 
          positions={validMoves}
          capturePositions={capturePositions}
        />
      )}
      
      {/* Camera controls - drag to rotate, scroll to zoom */}
      <OrbitControls 
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={0.25}
      />
    </>
  )
}

// Preload the model
useGLTF.preload('/models/chess_set_4k.gltf')
