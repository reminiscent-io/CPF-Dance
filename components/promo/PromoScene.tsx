'use client'

import type Konva from 'konva'
import { Ellipse, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva'
import type { PhotoLook } from '@/lib/promo/types'
import type { Scene, SceneNode, ScenePhoto } from '@/lib/promo/layout/scene'

export interface PromoSceneProps {
  scene: Scene
  /** Decoded image per asset id. Missing entries draw the slot's placeholder. */
  images: Record<string, CanvasImageSource | undefined>
  logo?: CanvasImageSource
  /** Editor hooks. Exports render without them. */
  onNodePointer?: (node: SceneNode, event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  listening?: boolean
}

function LookOverlay({ look, width, height }: { look: PhotoLook | undefined; width: number; height: number }) {
  if (!look || look === 'natural') return null
  if (look === 'warm') {
    return (
      <Rect
        width={width}
        height={height}
        fill="rgba(255, 168, 92, 0.16)"
        globalCompositeOperation="soft-light"
        listening={false}
      />
    )
  }
  const radius = Math.max(width, height)
  return (
    <>
      <Rect width={width} height={height} fill="rgba(10, 10, 10, 0.16)" globalCompositeOperation="multiply" listening={false} />
      <Rect
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientStartRadius={radius * 0.3}
        fillRadialGradientEndRadius={radius * 0.75}
        fillRadialGradientColorStops={[0, 'rgba(10, 10, 10, 0)', 1, 'rgba(10, 10, 10, 0.4)']}
        globalCompositeOperation="multiply"
        listening={false}
      />
    </>
  )
}

function PhotoNode({
  node,
  image,
  listening,
  onPointer,
}: {
  node: ScenePhoto
  image: CanvasImageSource | undefined
  listening: boolean
  onPointer?: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
}) {
  const clipFunc =
    node.mask === 'ellipse'
      ? (ctx: Konva.Context) => {
          ctx.beginPath()
          ctx.ellipse(node.width / 2, node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2)
          ctx.closePath()
        }
      : undefined
  return (
    <Group
      x={node.x}
      y={node.y}
      clipX={clipFunc ? undefined : 0}
      clipY={clipFunc ? undefined : 0}
      clipWidth={clipFunc ? undefined : node.width}
      clipHeight={clipFunc ? undefined : node.height}
      clipFunc={clipFunc}
      opacity={node.opacity}
      listening={listening}
      onMouseDown={onPointer}
      onTouchStart={onPointer}
    >
      <Rect width={node.width} height={node.height} fill={node.placeholder} cornerRadius={node.cornerRadius} />
      {image && node.draw ? (
        <>
          <KonvaImage image={image} x={node.draw.x} y={node.draw.y} width={node.draw.width} height={node.draw.height} />
          <LookOverlay look={node.look} width={node.width} height={node.height} />
        </>
      ) : null}
    </Group>
  )
}

/**
 * Draws a built scene with react-konva. Used inside the editor's Stage and
 * inside the off-screen Stage that produces exports, so both draw the same
 * nodes in the same order.
 */
export function PromoSceneNodes({ scene, images, logo, onNodePointer, listening = false }: PromoSceneProps) {
  return (
    <>
      <Rect x={0} y={0} width={scene.width} height={scene.height} fill={scene.background} listening={false} />
      {scene.nodes.map((node) => {
        const onPointer = onNodePointer
          ? (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onNodePointer(node, event)
          : undefined
        switch (node.type) {
          case 'rect':
            return (
              <Rect
                key={node.key}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={node.fill}
                stroke={node.stroke}
                strokeWidth={node.strokeWidth}
                cornerRadius={node.cornerRadius}
                opacity={node.opacity}
                fillLinearGradientStartPoint={node.gradient?.start}
                fillLinearGradientEndPoint={node.gradient?.end}
                fillLinearGradientColorStops={node.gradient?.stops}
                listening={listening}
                onMouseDown={onPointer}
                onTouchStart={onPointer}
              />
            )
          case 'ellipse':
            return (
              <Ellipse
                key={node.key}
                x={node.x + node.width / 2}
                y={node.y + node.height / 2}
                radiusX={node.width / 2}
                radiusY={node.height / 2}
                fill={node.fill}
                stroke={node.stroke}
                strokeWidth={node.strokeWidth}
                opacity={node.opacity}
                listening={listening}
                onMouseDown={onPointer}
                onTouchStart={onPointer}
              />
            )
          case 'line':
            return (
              <Line
                key={node.key}
                points={node.points}
                stroke={node.stroke}
                strokeWidth={node.strokeWidth}
                opacity={node.opacity}
                listening={false}
              />
            )
          case 'text':
            return (
              <Text
                key={node.key}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                text={node.text}
                fontFamily={node.fontFamily}
                fontStyle={String(node.fontWeight)}
                fontSize={node.fontSize}
                letterSpacing={node.letterSpacing}
                lineHeight={node.lineHeight}
                align={node.align}
                verticalAlign={node.verticalAlign}
                fill={node.fill}
                wrap="none"
                opacity={node.opacity}
                listening={listening}
                onMouseDown={onPointer}
                onTouchStart={onPointer}
              />
            )
          case 'photo':
            return (
              <PhotoNode
                key={node.key}
                node={node}
                image={node.assetId ? images[node.assetId] : undefined}
                listening={listening}
                onPointer={onPointer}
              />
            )
          case 'logo':
            return logo ? (
              <KonvaImage
                key={node.key}
                image={logo}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                listening={false}
              />
            ) : null
        }
      })}
    </>
  )
}
