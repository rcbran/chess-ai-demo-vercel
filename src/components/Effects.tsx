import { EffectComposer, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

export const Effects = () => {
  return (
    <EffectComposer>
      {/* Subtle chromatic aberration for that cinematic lens effect */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.0005, 0.0005)}
        radialModulation={true}
        modulationOffset={0.5}
      />
      
      {/* Vignette darkens edges for focus on center */}
      <Vignette
        offset={0.3}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

