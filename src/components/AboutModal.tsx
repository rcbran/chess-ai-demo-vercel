import { useEffect } from 'react'
import './AboutModal.css'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="about-modal">
      <button 
        className="close-button" 
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={0}
      >
        ×
      </button>
      
      <h2 className="about-title">About This Project</h2>
      
      <p className="about-description">
        This entire project was vibe coded using Cursor AI. From the 3D rendering 
        to the glassmorphism UI — every line of code was generated through 
        natural conversation with Claude.
      </p>
      
      <div className="tech-section">
        <h3>Tech Stack</h3>
        <ul className="tech-list">
          <li>
            <span className="tech-name">React 19</span>
            <span className="tech-desc">UI Framework</span>
          </li>
          <li>
            <span className="tech-name">Three.js</span>
            <span className="tech-desc">3D Graphics</span>
          </li>
          <li>
            <span className="tech-name">React Three Fiber</span>
            <span className="tech-desc">React renderer for Three.js</span>
          </li>
          <li>
            <span className="tech-name">React Three Drei</span>
            <span className="tech-desc">Useful helpers for R3F</span>
          </li>
          <li>
            <span className="tech-name">React Three Postprocessing</span>
            <span className="tech-desc">Visual effects</span>
          </li>
          <li>
            <span className="tech-name">TypeScript</span>
            <span className="tech-desc">Type safety</span>
          </li>
          <li>
            <span className="tech-name">Vite</span>
            <span className="tech-desc">Build tool</span>
          </li>
          <li>
            <span className="tech-name">Vercel</span>
            <span className="tech-desc">Deployment</span>
          </li>
        </ul>
      </div>
      
      <div className="credits-section">
        <a 
          href="https://github.com/rcbran/chess-ai-demo-vercel" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
          tabIndex={0}
        >
          <svg viewBox="0 0 24 24" className="github-icon" aria-hidden="true">
            <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          View on GitHub
        </a>
      </div>
    </div>
  )
}

interface AboutButtonProps {
  onClick: () => void
  hidden?: boolean
}

export const AboutButton = ({ onClick, hidden = false }: AboutButtonProps) => {
  return (
    <button 
      className={`about-button ${hidden ? 'hidden' : ''}`}
      onClick={onClick}
      aria-label="About this project"
      tabIndex={hidden ? -1 : 0}
    >
      ?
    </button>
  )
}

