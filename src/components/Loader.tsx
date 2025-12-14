import { useRef } from 'react'
import { useProgress } from '@react-three/drei'
import './Loader.css'

export const Loader = () => {
  const { progress, active } = useProgress()
  
  // Track the maximum progress to prevent backwards jumps
  const maxProgress = useRef(0)
  if (progress > maxProgress.current) {
    maxProgress.current = progress
  }
  
  // Reset max when loading completes
  if (!active) {
    maxProgress.current = 0
    return null
  }
  
  const displayProgress = Math.round(maxProgress.current)
  
  return (
    <div className="loader-container">
      <div className="loader-spinner" />
      <div className="loader-progress">
        {displayProgress}%
      </div>
      <div className="loader-text">Loading chess set...</div>
    </div>
  )
}
