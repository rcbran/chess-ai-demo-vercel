import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import type { Group, Object3D } from 'three'
import type { PieceType } from '../data/pieceData'

interface PiecePreviewProps {
  pieceType: PieceType
  color: 'white' | 'black'
}

// Inner component that renders inside Canvas
const PieceModel = ({ pieceType, color }: PiecePreviewProps) => {
  const groupRef = useRef<Group>(null)
  const { scene } = useGLTF('/models/chess_set_4k.gltf')
  
  // Find and clone the specific piece
  const pieceData = useMemo(() => {
    let foundPiece: Object3D | null = null
    
    // Find first matching piece of this type and color
    scene.traverse((child) => {
      if (!foundPiece && child.name.includes(`piece_${pieceType}_${color}`)) {
        foundPiece = child
      }
    })
    
    if (!foundPiece) {
      return null
    }
    
    // Clone the piece (type assertion needed because TS can't track mutation in traverse callback)
    const piece = foundPiece as Object3D
    const clone = piece.clone()
    
    // Reset the clone's position to origin
    clone.position.set(0, 0, 0)
    
    // Calculate bounding box to center and scale
    const box = new Box3().setFromObject(clone)
    const centerVec = new Vector3()
    box.getCenter(centerVec)
    
    const size = new Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetScale = 1.2 / maxDim // Fit in view
    
    // Offset to center the piece
    clone.position.set(-centerVec.x, -centerVec.y, -centerVec.z)
    
    return { 
      clone,
      scale: targetScale
    }
  }, [scene, pieceType, color])
  
  // Rotate the piece slowly
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4
    }
  })
  
  if (!pieceData) return null
  
  return (
    <group ref={groupRef} scale={pieceData.scale}>
      <primitive object={pieceData.clone} />
    </group>
  )
}

export const PiecePreview = ({ pieceType, color }: PiecePreviewProps) => {
  return (
    <div className="piece-preview">
      <Canvas
        camera={{ position: [0, 0.4, 2.4], fov: 35 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[3, 5, 3]} intensity={1.2} />
        <directionalLight position={[-3, 3, -3]} intensity={0.6} />
        
        <PieceModel pieceType={pieceType} color={color} />
        
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  )
}

