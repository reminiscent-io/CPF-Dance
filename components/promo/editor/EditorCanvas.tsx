'use client'

import type Konva from 'konva'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva'
import { applyNudge, type Scene, type SceneNode, type SceneText } from '@/lib/promo/layout/scene'
import { snapBox, snapTargets, type Guide } from '@/lib/promo/layout/snap'
import type { Box, FormatLayout } from '@/lib/promo/types'
import { PromoSceneNodes } from '../PromoScene'

// Stage Rose, from DESIGN.md: selection and guides are editor chrome, never exported.
const ROSE = '#b06472'
const GROUP_PREFIX = 'layer-'
const MIN_SIZE = 16

export interface EditorCanvasProps {
  scene: Scene
  images: Record<string, CanvasImageSource | undefined>
  layout: FormatLayout
  nudges: Record<string, Partial<Box>>
  displayWidth: number
  selected: string | null
  /** Laptop: drag, resize and double-click to type. Phone: tap selects. */
  direct: boolean
  onSelect: (node: SceneNode | null) => void
  onCommitBox: (layerId: string, box: Box) => void
  onEditText: (node: SceneText) => void
  /** DOM drawn over the canvas (the inline text editor), in CSS pixels. */
  overlay?: ReactNode
}

export function EditorCanvas({
  scene,
  images,
  layout,
  nudges,
  displayWidth,
  selected,
  direct,
  onSelect,
  onCommitBox,
  onEditText,
  overlay,
}: EditorCanvasProps) {
  const scale = displayWidth / scene.width
  const displayHeight = Math.round(scene.height * scale)
  const transformerRef = useRef<Konva.Transformer>(null)
  const lastPointer = useRef<SceneNode | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])

  const boxes = useMemo(
    () => new Map(layout.layers.map((layer) => [layer.id, applyNudge(layer.box, nudges[layer.id])])),
    [layout, nudges]
  )
  const kinds = useMemo(
    () => new Map(layout.layers.map((layer) => [layer.id, layer.kind === 'shape' ? layer.shape : layer.kind])),
    [layout]
  )

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const node = direct && selected ? transformer.getStage()?.findOne(`#${GROUP_PREFIX}${selected}`) : undefined
    transformer.nodes(node ? [node] : [])
    transformer.resizeEnabled(kinds.get(selected ?? '') !== 'line')
    transformer.getLayer()?.batchDraw()
  }, [direct, selected, scene, kinds])

  const layerIdOf = (group: Konva.Node) => group.id().slice(GROUP_PREFIX.length)

  const handleDragMove = (event: Konva.KonvaEventObject<DragEvent>) => {
    const group = event.target
    const layerId = layerIdOf(group)
    const box = boxes.get(layerId)
    if (!box) return
    const others = [...boxes.entries()].filter(([id]) => id !== layerId).map(([, other]) => other)
    const snapped = snapBox(
      { ...box, x: box.x + group.x(), y: box.y + group.y() },
      snapTargets({ width: scene.width, height: scene.height, safeArea: layout.safeArea }, others),
      6 / scale
    )
    group.position({ x: snapped.x - box.x, y: snapped.y - box.y })
    setGuides(snapped.guides)
  }

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    const group = event.target
    const layerId = layerIdOf(group)
    const box = boxes.get(layerId)
    const dx = group.x()
    const dy = group.y()
    group.position({ x: 0, y: 0 })
    setGuides([])
    if (box && (dx !== 0 || dy !== 0)) onCommitBox(layerId, { ...box, x: box.x + dx, y: box.y + dy })
  }

  const handleTransformEnd = (event: Konva.KonvaEventObject<Event>) => {
    const group = event.target
    const layerId = layerIdOf(group)
    const box = boxes.get(layerId)
    const sx = group.scaleX()
    const sy = group.scaleY()
    const gx = group.x()
    const gy = group.y()
    group.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
    if (!box) return
    onCommitBox(layerId, {
      x: gx + box.x * sx,
      y: gy + box.y * sy,
      width: Math.max(MIN_SIZE, box.width * sx),
      height: kinds.get(layerId) === 'line' ? box.height : Math.max(MIN_SIZE, box.height * sy),
    })
  }

  const selectedBox = selected ? boxes.get(selected) : undefined

  return (
    <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
      <Stage
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) onSelect(null)
        }}
        onTouchStart={(event) => {
          if (event.target === event.target.getStage()) onSelect(null)
        }}
        onDblClick={() => {
          if (direct && lastPointer.current?.type === 'text') onEditText(lastPointer.current)
        }}
        onDblTap={() => {
          if (direct && lastPointer.current?.type === 'text') onEditText(lastPointer.current)
        }}
      >
        <Layer>
          <PromoSceneNodes
            scene={scene}
            images={images}
            listening
            onNodePointer={(node) => {
              lastPointer.current = node
              onSelect(node)
            }}
            wrapLayer={(rootLayerId, children) => (
              <Group
                id={`${GROUP_PREFIX}${rootLayerId}`}
                draggable={direct}
                dragDistance={4}
                onDragStart={() => onSelect(lastPointer.current)}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
              >
                {children}
              </Group>
            )}
          />
        </Layer>
        <Layer listening={direct}>
          {layout.safeArea && (
            <>
              <Line
                points={[0, layout.safeArea.top, scene.width, layout.safeArea.top]}
                stroke={ROSE}
                strokeWidth={1 / scale}
                dash={[6 / scale, 6 / scale]}
                opacity={0.6}
                listening={false}
              />
              <Line
                points={[0, scene.height - layout.safeArea.bottom, scene.width, scene.height - layout.safeArea.bottom]}
                stroke={ROSE}
                strokeWidth={1 / scale}
                dash={[6 / scale, 6 / scale]}
                opacity={0.6}
                listening={false}
              />
            </>
          )}
          {!direct && selectedBox && (
            <Rect
              x={selectedBox.x}
              y={selectedBox.y}
              width={Math.max(selectedBox.width, 1)}
              height={Math.max(selectedBox.height, 1)}
              stroke={ROSE}
              strokeWidth={2 / scale}
              listening={false}
            />
          )}
          {guides.map((guide, index) =>
            guide.orientation === 'vertical' ? (
              <Line
                key={index}
                points={[guide.position, 0, guide.position, scene.height]}
                stroke={ROSE}
                strokeWidth={1 / scale}
                listening={false}
              />
            ) : (
              <Line
                key={index}
                points={[0, guide.position, scene.width, guide.position]}
                stroke={ROSE}
                strokeWidth={1 / scale}
                listening={false}
              />
            )
          )}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={false}
            ignoreStroke
            flipEnabled={false}
            borderStroke={ROSE}
            anchorStroke={ROSE}
            anchorFill="#faf8f5"
            anchorSize={9}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < MIN_SIZE * scale || newBox.height < 2 ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>
      {overlay}
    </div>
  )
}
