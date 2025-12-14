import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import type { Points as PointsType } from 'three'
import * as THREE from 'three'

interface AnimatedBackgroundProps {
  count?: number
}

// Helper function to generate random positions (outside component to avoid purity issues)
const generateSpherePositions = (count: number): Float32Array => {
  const pos = new Float32Array(count * 3)
  
  for (let i = 0; i < count; i++) {
    // Distribute in a large sphere around the scene
    const radius = 15 + Math.random() * 25
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = radius * Math.cos(phi)
  }
  
  return pos
}

export const AnimatedBackground = ({ count = 650 }: AnimatedBackgroundProps) => {
  const pointsRef = useRef<PointsType>(null)
  
  // Generate random positions in a sphere
  const positions = useMemo(() => generateSpherePositions(count), [count])
  
  // Almost imperceptible rotation
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.0003
      pointsRef.current.rotation.x += delta * 0.0001
    }
  })
  
  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.008}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.15}
      />
    </Points>
  )
}

// Helper function to generate ambient particle positions
const generateAmbientPositions = (): Float32Array => {
  const count = 35
  const pos = new Float32Array(count * 3)
  
  for (let i = 0; i < count; i++) {
    // Scattered around the chess board area
    pos[i * 3] = (Math.random() - 0.5) * 2
    pos[i * 3 + 1] = Math.random() * 1.5
    pos[i * 3 + 2] = (Math.random() - 0.5) * 2
  }
  
  return pos
}

// Floating ambient particles closer to the board
export const AmbientParticles = () => {
  const pointsRef = useRef<PointsType>(null)
  
  const positions = useMemo(() => generateAmbientPositions(), [])
  
  useFrame((state) => {
    if (pointsRef.current) {
      // Very gentle floating motion
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.008
      
      // Make particles gently bob up and down
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length / 3; i++) {
        const originalY = positions[i * 3 + 1]
        positions[i * 3 + 1] = originalY + Math.sin(state.clock.elapsedTime + i) * 0.0001
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.005}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.1}
      />
    </Points>
  )
}
