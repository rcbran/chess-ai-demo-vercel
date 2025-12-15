import { useRef, useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import './Loader.css'

export const Loader = () => {
  const { progress, active } = useProgress()
  const maxProgress = useRef(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  
  // Track the maximum progress to prevent backwards jumps
  useEffect(() => {
    if (active && progress > maxProgress.current) {
      maxProgress.current = progress
      setDisplayProgress(Math.round(maxProgress.current))
    } else if (!active) {
      maxProgress.current = 0
      setDisplayProgress(0)
    }
  }, [progress, active])
  
  if (!active) {
    return null
  }
  
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
