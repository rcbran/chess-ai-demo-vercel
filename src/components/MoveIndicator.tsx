import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RingGeometry, CircleGeometry, MeshBasicMaterial, DoubleSide, type Mesh } from 'three'
import type { Position } from '../game/types'
import { positionToWorldPosition } from '../game/boardMapping'

interface MoveIndicatorProps {
  positions: Position[]
  capturePositions?: Position[]
  onHoverChange?: (position: Position | null) => void
  // External hover from Scene (when hovering piece on a valid move/capture square)
  externalHoveredSquare?: Position | null
}

export const MoveIndicator = ({ positions, capturePositions = [], onHoverChange, externalHoveredSquare }: MoveIndicatorProps) => {
  const meshRefs = useRef<(Mesh | null)[]>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  // Find index of externally hovered square (from hovering piece mesh)
  const externalHoveredIndex = externalHoveredSquare 
    ? positions.findIndex(p => p.row === externalHoveredSquare.row && p.col === externalHoveredSquare.col)
    : -1
  
  // Create ring geometry for capture indicators
  const ringGeometry = useMemo(() => new RingGeometry(0.018, 0.024, 32), [])
  
  // Larger filled ring for hovered captures
  const ringHoveredGeometry = useMemo(() => new RingGeometry(0.014, 0.028, 32), [])
  
  // Create dot geometry for regular moves (smaller filled circle effect)
  const dotGeometry = useMemo(() => new RingGeometry(0.008, 0.012, 32), [])
  
  // Larger filled circle for hovered moves
  const dotHoveredGeometry = useMemo(() => new CircleGeometry(0.018, 32), [])
  
  // Materials for regular moves and captures
  const moveMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0x44ff88,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  }), [])
  
  // Brighter material for hovered moves
  const moveHoveredMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0x66ffaa,
    transparent: true,
    opacity: 0.95,
    side: DoubleSide,
  }), [])
  
  const captureMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0xff5544,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  }), [])
  
  // Brighter material for hovered captures
  const captureHoveredMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0xff7766,
    transparent: true,
    opacity: 0.95,
    side: DoubleSide,
  }), [])

  // Check if a position is a capture
  const isCapture = (pos: Position): boolean => {
    return capturePositions.some(cp => cp.row === pos.row && cp.col === pos.col)
  }

  // Handle pointer enter for hover effect
  const handlePointerEnter = useCallback((index: number, pos: Position) => {
    setHoveredIndex(index)
    onHoverChange?.(pos)
  }, [onHoverChange])

  // Handle pointer leave
  const handlePointerLeave = useCallback(() => {
    setHoveredIndex(null)
    onHoverChange?.(null)
  }, [onHoverChange])

  // Clear stale refs when positions array shrinks
  useEffect(() => {
    // Trim refs array to current positions length to prevent unbounded growth
    if (meshRefs.current.length > positions.length) {
      meshRefs.current.length = positions.length
    }
  }, [positions.length])

  // Subtle pulse animation (only for non-hovered indicators)
  useFrame(({ clock }) => {
    const pulse = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.25
    // Only iterate over valid refs up to current positions length, filtering out nulls
    meshRefs.current.slice(0, positions.length).forEach((mesh, index) => {
      if (mesh && mesh.material && 'opacity' in mesh.material) {
        // Hovered indicators stay bright (either direct or external), others pulse
        const isThisHovered = index === hoveredIndex || index === externalHoveredIndex
        if (!isThisHovered) {
          (mesh.material as MeshBasicMaterial).opacity = pulse
        }
      }
    })
  })

  return (
    <>
      {positions.map((pos, index) => {
        const worldPos = positionToWorldPosition(pos)
        const capture = isCapture(pos)
        // Consider both direct hover and external hover (from piece mesh)
        const isHovered = hoveredIndex === index || externalHoveredIndex === index
        
        // Select geometry based on hover state
        const geometry = capture
          ? (isHovered ? ringHoveredGeometry : ringGeometry)
          : (isHovered ? dotHoveredGeometry : dotGeometry)
        
        // Select material based on hover state
        const material = capture
          ? (isHovered ? captureHoveredMaterial : captureMaterial)
          : (isHovered ? moveHoveredMaterial : moveMaterial)
        
        return (
          <mesh
            key={`move-indicator-${pos.row}-${pos.col}`}
            ref={(el) => { meshRefs.current[index] = el }}
            position={[worldPos.x, worldPos.y + 0.002, worldPos.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={geometry}
            material={material}
            onPointerEnter={() => handlePointerEnter(index, pos)}
            onPointerLeave={handlePointerLeave}
          />
        )
      })}
    </>
  )
}

