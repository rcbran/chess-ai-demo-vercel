import './TitleOverlay.css'

interface TitleOverlayProps {
  hidden?: boolean
}

export const TitleOverlay = ({ hidden = false }: TitleOverlayProps) => {
  return (
    <div className={`title-overlay ${hidden ? 'hidden' : ''}`}>
      <h1 className="title">Interactive Chess</h1>
      <p className="subtitle">Click any piece to learn its moves</p>
    </div>
  )
}

