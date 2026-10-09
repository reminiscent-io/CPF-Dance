'use client'

import type Konva from 'konva'
import type { ReactNode, Ref } from 'react'
import { Layer, Stage } from 'react-konva'
import type { Scene, SceneNode } from '@/lib/promo/layout/scene'
import { PromoSceneNodes } from './PromoScene'

export interface PromoCanvasProps {
  scene: Scene
  images: Record<string, CanvasImageSource | undefined>
  logo?: CanvasImageSource
  /** On-screen width in CSS pixels; height follows the format. */
  displayWidth: number
  onNodePointer?: (node: SceneNode, event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onBackgroundPointer?: () => void
  /** Editor chrome (selection, guides), drawn above the design in scene units. */
  overlay?: ReactNode
  stageRef?: Ref<Konva.Stage>
  className?: string
  ariaLabel?: string
}

/** A design drawn at screen size. Pass `onNodePointer` to make it selectable. */
export function PromoCanvas({
  scene,
  images,
  logo,
  displayWidth,
  onNodePointer,
  onBackgroundPointer,
  overlay,
  stageRef,
  className,
  ariaLabel,
}: PromoCanvasProps) {
  const scale = displayWidth / scene.width
  const displayHeight = Math.round(scene.height * scale)
  const interactive = Boolean(onNodePointer)
  return (
    <div
      className={className}
      style={{ width: displayWidth, height: displayHeight }}
      role="img"
      aria-label={ariaLabel ?? 'Promo design preview'}
    >
      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        listening={interactive || Boolean(onBackgroundPointer)}
        onMouseDown={(event) => {
          if (onBackgroundPointer && event.target === event.target.getStage()) onBackgroundPointer()
        }}
        onTouchStart={(event) => {
          if (onBackgroundPointer && event.target === event.target.getStage()) onBackgroundPointer()
        }}
      >
        <Layer listening={interactive}>
          <PromoSceneNodes
            scene={scene}
            images={images}
            logo={logo}
            onNodePointer={onNodePointer}
            listening={interactive}
          />
        </Layer>
        {overlay ? <Layer>{overlay}</Layer> : null}
      </Stage>
    </div>
  )
}
