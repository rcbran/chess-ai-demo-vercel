import { useRef, useEffect, useMemo, useCallback, useState, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import { Color as ThreeColor, MeshStandardMaterial, type Group, type Mesh, type Object3D, type Material } from 'three'
import { getPieceTypeFromName, getPieceColorFromName, type PieceType } from '../data/pieceData'
import type { Color } from '../game/types'

interface SceneProps {
  onPieceClick: (pieceType: PieceType, color: 'white' | 'black', meshName: string, screenX: number) => void
  onPieceHover: (meshName: string | null) => void
  onBoardClick: () => void
  selectedPiece: string | null
  hoveredPiece: string | null
  gameMode?: 'demo' | 'play'
  playerColor?: Color | null
}

// Store original materials for each mesh
const originalMaterials = new Map<string, Material | Material[]>()

export const Scene = ({ onPieceClick, onPieceHover, onBoardClick, selectedPiece, hoveredPiece, gameMode = 'demo', playerColor = null }: SceneProps) => {
  const groupRef = useRef<Group>(null)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
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

  // Update highlights when hover/selection changes
  useEffect(() => {
    if (selectedPiece) {
      setHighlight(selectedPiece, new ThreeColor(0x00ff00)) // Bright green for selected
    } else if (hoveredPiece) {
      setHighlight(hoveredPiece, new ThreeColor(0x00aaff)) // Bright blue for hover
    } else {
      setHighlight(null, null) // Reset all
    }
  }, [selectedPiece, hoveredPiece, setHighlight])

  // Handle click on scene objects
  const handleClick = (event: { stopPropagation: () => void; object: Object3D; pointer: { x: number } }) => {
    event.stopPropagation()
    
    const clickedObject = event.object as Object3D
    
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
      setIsHoveringPiece(true)
      onPieceHover(target.name)
    }
  }

  const handlePointerOut = () => {
    setIsHoveringPiece(false)
    onPieceHover(null)
  }

  // Control auto-rotate and camera locking based on game mode
  useEffect(() => {
    if (controlsRef.current) {
      if (gameMode === 'play') {
        // Play mode: Disable auto-rotate and lock controls
        controlsRef.current.autoRotate = false
        controlsRef.current.enableRotate = false
        controlsRef.current.enablePan = false
        controlsRef.current.enableZoom = false
        
        // Set camera position based on player color
        if (playerColor === 'white') {
          // White side: Camera at [0, 0.35, 0.6] looking toward negative Z
          camera.position.set(0, 0.35, 0.6)
          camera.lookAt(0, 0, 0)
        } else if (playerColor === 'black') {
          // Black side: Camera at [0, 0.35, -0.6] looking toward positive Z (rotated 180°)
          camera.position.set(0, 0.35, -0.6)
          camera.lookAt(0, 0, 0)
        }
        controlsRef.current.update()
      } else {
        // Demo mode: Enable controls and auto-rotate
        controlsRef.current.enableRotate = true
        controlsRef.current.enablePan = true
        controlsRef.current.enableZoom = true
        
        // Stop rotation when a piece is selected
        controlsRef.current.autoRotate = selectedPiece === null
        
        // Slow down rotation when hovering
        if (hoveredPiece && !selectedPiece) {
          controlsRef.current.autoRotateSpeed = 0.05
        } else {
          controlsRef.current.autoRotateSpeed = 0.25
        }
      }
    }
  }, [gameMode, playerColor, selectedPiece, hoveredPiece, camera])

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
