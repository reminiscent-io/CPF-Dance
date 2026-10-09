'use client'

import { Input, Select } from '@/components/ui'
import { COLOR_TOKEN_LABELS } from '@/lib/promo/brand'
import { COLOR_TOKENS, FONT_ROLES, type ColorToken, type Layer, type TemplateDefinition, type TextStyle } from '@/lib/promo/types'

const numberClass =
  'mt-1 w-full min-h-control rounded-lg border border-champagne-200 bg-champagne-50 px-3 text-charcoal-900 tabular-nums ' +
  'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500'

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string
  value: number | undefined
  step?: number
  onChange: (value: number | undefined) => void
}) {
  return (
    <label className="block text-xs font-medium text-charcoal-500">
      {label}
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(event) => {
          if (event.target.value === '') return onChange(undefined)
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(next)
        }}
        className={numberClass}
      />
    </label>
  )
}

const tokenOptions = (allowNone: boolean) => [
  ...(allowNone ? [{ value: '', label: 'None' }] : []),
  ...COLOR_TOKENS.map((token) => ({ value: token, label: COLOR_TOKEN_LABELS[token] })),
]

export interface LayerInspectorProps {
  layer: Layer
  definition: TemplateDefinition
  onChange: (recipe: (layer: Layer) => Layer, group: string) => void
}

/**
 * Settings for one layer. Colors are brand tokens and fonts are roles, so a
 * template can't hard-code a color or face the brand kit doesn't define.
 */
export function LayerInspector({ layer, definition, onChange }: LayerInspectorProps) {
  const set = (field: string, recipe: (layer: Layer) => Layer) => onChange(recipe, `${layer.id}:${field}`)
  const setBox = (key: 'x' | 'y' | 'width' | 'height') => (value: number | undefined) =>
    value !== undefined && set(`box.${key}`, (current) => ({ ...current, box: { ...current.box, [key]: value } }))

  return (
    <div className="space-y-5">
      <Input
        label="Name"
        name="layer-name"
        value={layer.name ?? ''}
        onChange={(event) => set('name', (current) => ({ ...current, name: event.target.value || undefined }))}
      />
      <div className="grid grid-cols-4 gap-2">
        <NumberField label="X" value={layer.box.x} onChange={setBox('x')} />
        <NumberField label="Y" value={layer.box.y} onChange={setBox('y')} />
        <NumberField label="Width" value={layer.box.width} onChange={setBox('width')} />
        <NumberField label="Height" value={layer.box.height} onChange={setBox('height')} />
      </div>

      {layer.kind === 'text' && <TextSettings layer={layer} definition={definition} set={set} />}

      {layer.kind === 'shape' && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Fill"
            name="layer-fill"
            value={layer.fill ?? ''}
            options={tokenOptions(true)}
            onChange={(event) =>
              set('fill', (current) => ({ ...current, fill: (event.target.value || undefined) as ColorToken | undefined }))
            }
          />
          <Select
            label="Stroke"
            name="layer-stroke"
            value={layer.stroke ?? ''}
            options={tokenOptions(true)}
            onChange={(event) =>
              set('stroke', (current) => ({ ...current, stroke: (event.target.value || undefined) as ColorToken | undefined }))
            }
          />
          <NumberField
            label="Stroke width"
            step={0.5}
            value={layer.strokeWidth}
            onChange={(value) => set('strokeWidth', (current) => ({ ...current, strokeWidth: value }))}
          />
          {layer.shape === 'rect' && (
            <NumberField
              label="Corner radius"
              value={layer.cornerRadius}
              onChange={(value) => set('cornerRadius', (current) => ({ ...current, cornerRadius: value }))}
            />
          )}
        </div>
      )}

      {layer.kind === 'photo' && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Photo slot"
            name="layer-photo-slot"
            value={layer.slot ?? ''}
            options={definition.slots.filter((slot) => slot.kind === 'photo').map((slot) => ({ value: slot.id, label: slot.label }))}
            onChange={(event) => set('slot', (current) => ({ ...current, slot: event.target.value }))}
          />
          <Select
            label="Shape"
            name="layer-mask"
            value={layer.mask ?? 'rect'}
            options={[
              { value: 'rect', label: 'Rectangle' },
              { value: 'ellipse', label: 'Oval' },
            ]}
            onChange={(event) => set('mask', (current) => ({ ...current, mask: event.target.value as 'rect' | 'ellipse' }))}
          />
        </div>
      )}

      {layer.kind === 'repeater' && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Direction"
            name="layer-direction"
            value={layer.direction}
            options={[
              { value: 'row', label: 'Row' },
              { value: 'column', label: 'Column' },
            ]}
            onChange={(event) => set('direction', (current) => ({ ...current, direction: event.target.value as 'row' | 'column' }))}
          />
          <Select
            label="When items don’t fit"
            name="layer-overflow"
            value={layer.overflow ?? 'scale'}
            options={[
              { value: 'scale', label: 'Shrink them' },
              { value: 'wrap', label: 'Wrap to a new line' },
            ]}
            onChange={(event) => set('overflow', (current) => ({ ...current, overflow: event.target.value as 'scale' | 'wrap' }))}
          />
          <NumberField label="Gap" value={layer.gap} onChange={(value) => set('gap', (current) => ({ ...current, gap: value ?? 0 }))} />
          <NumberField
            label="Most items shown"
            value={layer.maxVisible}
            onChange={(value) => set('maxVisible', (current) => ({ ...current, maxVisible: value }))}
          />
          <p className="col-span-2 text-xs text-charcoal-500">
            The item design inside a repeater is edited in the JSON tab.
          </p>
        </div>
      )}
    </div>
  )
}

function TextSettings({
  layer,
  definition,
  set,
}: {
  layer: Extract<Layer, { kind: 'text' }>
  definition: TemplateDefinition
  set: (field: string, recipe: (layer: Layer) => Layer) => void
}) {
  const style = (field: keyof TextStyle, value: unknown) =>
    set(`style.${field}`, (current) =>
      current.kind === 'text' ? { ...current, style: { ...current.style, [field]: value } } : current
    )
  const slots = definition.slots.filter((slot) => slot.kind === 'text' || slot.kind === 'list')

  return (
    <div className="space-y-4">
      {!layer.field && (
        <Select
          label="Shows"
          name="layer-slot"
          value={layer.slot ?? ''}
          options={[{ value: '', label: 'Fixed text' }, ...slots.map((slot) => ({ value: slot.id, label: slot.label }))]}
          onChange={(event) =>
            set('slot', (current) =>
              current.kind === 'text' ? { ...current, slot: event.target.value || undefined } : current
            )
          }
        />
      )}
      {!layer.slot && !layer.field && (
        <Input
          label="Text"
          name="layer-text"
          value={layer.text ?? ''}
          onChange={(event) =>
            set('text', (current) => (current.kind === 'text' ? { ...current, text: event.target.value } : current))
          }
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Font role"
          name="layer-font"
          value={layer.style.font}
          options={FONT_ROLES.map((role) => ({ value: role, label: role[0].toUpperCase() + role.slice(1) }))}
          onChange={(event) => style('font', event.target.value)}
        />
        <Select
          label="Color"
          name="layer-color"
          value={layer.style.color}
          options={tokenOptions(false)}
          onChange={(event) => style('color', event.target.value)}
        />
        <NumberField label="Size" step={0.5} value={layer.style.size} onChange={(value) => value && style('size', value)} />
        <NumberField label="Smallest size" step={0.5} value={layer.style.minSize} onChange={(value) => style('minSize', value)} />
        <NumberField label="Weight" step={100} value={layer.style.weight} onChange={(value) => value && style('weight', value)} />
        <NumberField label="Tracking (em)" step={0.01} value={layer.style.tracking} onChange={(value) => style('tracking', value)} />
        <NumberField label="Line height" step={0.05} value={layer.style.lineHeight} onChange={(value) => style('lineHeight', value)} />
        <NumberField label="Most lines" value={layer.style.maxLines} onChange={(value) => style('maxLines', value)} />
        <Select
          label="Align"
          name="layer-align"
          value={layer.style.align ?? 'center'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(event) => style('align', event.target.value)}
        />
        <Select
          label="Capitals"
          name="layer-case"
          value={layer.style.uppercase ? 'upper' : 'as-typed'}
          options={[
            { value: 'as-typed', label: 'As typed' },
            { value: 'upper', label: 'All capitals' },
          ]}
          onChange={(event) => style('uppercase', event.target.value === 'upper')}
        />
      </div>
    </div>
  )
}
