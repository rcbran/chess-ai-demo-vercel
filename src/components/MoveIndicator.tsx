import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RingGeometry, MeshBasicMaterial, DoubleSide, type Mesh } from 'three'
import type { Position } from '../game/types'
import { positionToWorldPosition } from '../game/boardMapping'

interface MoveIndicatorProps {
  positions: Position[]
  capturePositions?: Position[]
}

export const MoveIndicator = ({ positions, capturePositions = [] }: MoveIndicatorProps) => {
  const meshRefs = useRef<(Mesh | null)[]>([])
  
  // Clear stale refs when positions change to avoid updating unmounted meshes
  useEffect(() => {
    meshRefs.current = []
  }, [positions])
  
  // Create ring geometry for indicators
  const ringGeometry = useMemo(() => new RingGeometry(0.018, 0.024, 32), [])
  
  // Create dot geometry for regular moves (smaller filled circle effect)
  const dotGeometry = useMemo(() => new RingGeometry(0.008, 0.012, 32), [])
  
  // Materials for regular moves and captures
  const moveMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0x44ff88,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  }), [])
  
  const captureMaterial = useMemo(() => new MeshBasicMaterial({
    color: 0xff5544,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  }), [])

  // Check if a position is a capture
  const isCapture = (pos: Position): boolean => {
    return capturePositions.some(cp => cp.row === pos.row && cp.col === pos.col)
  }

  // Subtle pulse animation
  useFrame(({ clock }) => {
    const pulse = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.25
    // Use slice to avoid iterating over stale refs from previous positions
    meshRefs.current.slice(0, positions.length).forEach(mesh => {
      if (mesh?.material && 'opacity' in mesh.material) {
        (mesh.material as MeshBasicMaterial).opacity = pulse
      }
    })
  })

  return (
    <>
      {positions.map((pos, index) => {
        const worldPos = positionToWorldPosition(pos)
        const capture = isCapture(pos)
        
        return (
          <mesh
            key={`move-indicator-${pos.row}-${pos.col}`}
            ref={(el) => { meshRefs.current[index] = el }}
            position={[worldPos.x, worldPos.y + 0.002, worldPos.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={capture ? ringGeometry : dotGeometry}
            material={capture ? captureMaterial : moveMaterial}
          />
        )
      })}
    </>
  )
}

