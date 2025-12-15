import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export const Effects = () => {
  return (
    <EffectComposer>
      {/* Vignette darkens edges for focus on center - helps black pieces stand out */}
      <Vignette
        offset={0.3}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

