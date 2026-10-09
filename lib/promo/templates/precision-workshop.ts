import type {
  FormatLayout,
  Layer,
  RepeaterLayer,
  SlotDef,
  TemplateDefinition,
  TextLayer,
  TextStyle,
} from '../types'

/**
 * Template #1, built from the "Precision Workshop" reference poster: hero
 * photo, a strip of up to four photos, eyebrow name, two-line title (black
 * serif, gold serif), tagline, focus words, date circles, description,
 * feature pills, a level divider and the dark "Led by" block.
 *
 * The three formats come from one stacking function so they stay in step.
 * This file only seeds version 1; after that the template lives in the
 * database and changes through the template editor.
 */

export const PRECISION_WORKSHOP_SLUG = 'precision-workshop'

export const PRECISION_WORKSHOP_SLOTS: SlotDef[] = [
  {
    id: 'eyebrow',
    label: 'Name line',
    binding: 'brand',
    kind: 'text',
    source: 'name',
    maxChars: 40,
    aliases: ['name', 'eyebrow', 'name line'],
  },
  {
    id: 'title_primary',
    label: 'Title, first line',
    binding: 'copy',
    kind: 'text',
    maxChars: 12,
    required: true,
    guidance: 'One strong word naming the idea of the class, shown in black serif capitals.',
    aliases: ['title', 'headline', 'first line', 'black line'],
    example: 'Precision',
  },
  {
    id: 'title_accent',
    label: 'Title, second line',
    binding: 'copy',
    kind: 'text',
    maxChars: 12,
    required: true,
    guidance: 'One word naming the format (Workshop, Intensive, Masterclass, Series), shown in gold serif capitals.',
    aliases: ['title', 'headline', 'second line', 'gold line'],
    example: 'Workshop',
  },
  {
    id: 'tagline',
    label: 'Tagline',
    binding: 'copy',
    kind: 'text',
    maxChars: 28,
    required: true,
    guidance: 'Two very short sentences with rhythm, in the spirit of "Three days. One focus."',
    aliases: ['tagline', 'subtitle', 'subhead', 'strapline'],
    example: 'Three days. One focus.',
  },
  {
    id: 'keywords',
    label: 'Focus words',
    binding: 'copy',
    kind: 'list',
    maxChars: 12,
    list: { min: 3, max: 6, target: 6 },
    guidance: 'Single words naming what the class trains.',
    aliases: ['focus words', 'keywords', 'focus', 'key words'],
    example: ['Technique', 'Strength', 'Styling', 'Kicks', 'Cleanliness', 'Performance'],
  },
  {
    id: 'sessions',
    label: 'Dates and times',
    binding: 'fact',
    kind: 'sessions',
    source: 'sessions',
    list: { min: 1, max: 4 },
    aliases: ['dates', 'date', 'times', 'time', 'schedule', 'sessions'],
    example: [
      { weekday: 'Fri', date: 'Nov 13', time: '5:00–7:00 PM' },
      { weekday: 'Sat', date: 'Nov 14', time: '11:00 AM – 1:00 PM' },
      { weekday: 'Sun', date: 'Nov 15', time: '11:00 AM – 1:00 PM' },
    ],
  },
  {
    id: 'location',
    label: 'Location',
    binding: 'fact',
    kind: 'text',
    source: 'location',
    maxChars: 60,
    aliases: ['location', 'venue', 'studio', 'place', 'address'],
  },
  {
    id: 'description',
    label: 'Description',
    binding: 'copy',
    kind: 'text',
    maxChars: 170,
    required: true,
    guidance: 'One or two sentences inviting dancers in and naming what they will leave with.',
    aliases: ['description', 'paragraph', 'blurb', 'body', 'copy'],
    example:
      'Join for an intensive three-day precision workshop designed to elevate your technique, build strength, and refine your performance quality.',
  },
  {
    id: 'pills',
    label: 'Feature list',
    binding: 'copy',
    kind: 'list',
    maxChars: 32,
    list: { min: 2, max: 6, target: 4 },
    guidance: 'What the sessions cover, two to four words each.',
    aliases: ['pills', 'features', 'feature list', 'bullets', 'list'],
    example: [
      'Kick technique & flexibility',
      'Precision drills & cleanliness',
      'Strength & conditioning',
      'Styling & performance',
    ],
  },
  {
    id: 'level',
    label: 'Level line',
    binding: 'fact',
    kind: 'text',
    source: 'level',
    maxChars: 32,
    aliases: ['level', 'levels', 'all levels'],
    example: 'All levels welcome',
  },
  {
    id: 'led_by',
    label: 'Led by line',
    binding: 'brand',
    kind: 'text',
    source: 'ledBy',
    maxChars: 20,
    aliases: ['led by'],
  },
  {
    id: 'signature',
    label: 'Signature',
    binding: 'brand',
    kind: 'text',
    source: 'signature',
    maxChars: 30,
    aliases: ['signature', 'script name', 'script'],
  },
  {
    id: 'credential_primary',
    label: 'Credential',
    binding: 'brand',
    kind: 'text',
    source: 'credentialPrimary',
    maxChars: 60,
    aliases: ['credential', 'rockette line'],
  },
  {
    id: 'credential_secondary',
    label: 'Credential details',
    binding: 'brand',
    kind: 'text',
    source: 'credentialSecondary',
    maxChars: 80,
    aliases: ['credential details', 'roles'],
  },
  {
    id: 'hero',
    label: 'Hero photo',
    binding: 'photo',
    kind: 'photo',
    required: true,
    preferredShots: ['full_body', 'three_quarter'],
    aliases: ['hero', 'main photo', 'big photo', 'hero photo'],
  },
  {
    id: 'strip',
    label: 'Photo strip',
    binding: 'photo',
    kind: 'photos',
    list: { min: 0, max: 4 },
    preferredShots: ['kick', 'headshot', 'arms_up', 'detail'],
    aliases: ['strip', 'side photos', 'small photos', 'photo strip'],
  },
]

interface ColumnSpec {
  /** Left edge and width of the text column. */
  x: number
  width: number
  top: number
  /** Scale for type and element sizes, relative to the post. */
  s: number
  /** Extra multiplier for the gaps between elements. */
  gapScale: number
  pills: boolean
  credentialSecondary: boolean
  /** Bio block width, defaults to the column. */
  bioX?: number
  bioWidth?: number
}

function style(partial: Partial<TextStyle> & Pick<TextStyle, 'font' | 'size' | 'color'>): TextStyle {
  return {
    weight: 500,
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    maxLines: 1,
    ...partial,
  }
}

function text(
  id: string,
  name: string,
  box: Layer['box'],
  textStyle: TextStyle,
  extra: Partial<TextLayer> = {}
): TextLayer {
  return { id, name, kind: 'text', box, style: textStyle, ...extra }
}

/** The type stack shared by every format, from the eyebrow down to the bio block. */
function buildColumn(spec: ColumnSpec): { layers: Layer[]; bottom: number } {
  const { x, width, s } = spec
  const center = x + width / 2
  const S = (n: number) => Math.round(n * s * 100) / 100
  const G = (n: number) => Math.round(n * s * spec.gapScale * 100) / 100
  const layers: Layer[] = []
  let y = spec.top

  const add = (height: number, make: (top: number, h: number) => Layer | Layer[], gapAfter = 0) => {
    const h = S(height)
    const made = make(y, h)
    layers.push(...(Array.isArray(made) ? made : [made]))
    y += h + G(gapAfter)
  }

  const divider = (id: string) =>
    add(
      2,
      (top) => ({
        id,
        name: 'Divider',
        kind: 'shape',
        shape: 'line',
        box: { x: center - S(60), y: top, width: S(120), height: 0 },
        stroke: 'accent',
        strokeWidth: S(1.5),
      }),
      14
    )

  add(
    30,
    (top, h) =>
      text('eyebrow', 'Name line', { x, y: top, width, height: h }, style({
        font: 'caps', size: S(22), weight: 500, tracking: 0.45, uppercase: true, color: 'ink',
      }), { slot: 'eyebrow' }),
    16
  )
  divider('divider_top')
  add(
    104,
    (top, h) =>
      text('title_primary', 'Title, first line', { x, y: top, width, height: h }, style({
        font: 'display', size: S(92), minSize: S(48), weight: 600, uppercase: true, color: 'ink', lineHeight: 1,
      }), { slot: 'title_primary' }),
    -12
  )
  add(
    104,
    (top, h) =>
      text('title_accent', 'Title, second line', { x, y: top, width, height: h }, style({
        font: 'display', size: S(92), minSize: S(48), weight: 600, uppercase: true, color: 'accent', lineHeight: 1,
      }), { slot: 'title_accent' }),
    16
  )
  add(
    30,
    (top, h) =>
      text('tagline', 'Tagline', { x, y: top, width, height: h }, style({
        font: 'caps', size: S(20), minSize: S(14), weight: 500, tracking: 0.32, uppercase: true, color: 'ink',
      }), { slot: 'tagline' }),
    16
  )
  divider('divider_mid')
  add(
    60,
    (top, h) =>
      text('keywords', 'Focus words', { x, y: top, width, height: h }, style({
        font: 'caps', size: S(15), minSize: S(11), weight: 500, tracking: 0.2, uppercase: true,
        color: 'inkSoft', maxLines: 2, lineHeight: 1.7,
      }), { slot: 'keywords', join: '  |  ' }),
    18
  )

  const sessions: RepeaterLayer = {
    id: 'sessions',
    name: 'Date circles',
    kind: 'repeater',
    slot: 'sessions',
    direction: 'row',
    gap: S(12),
    align: 'center',
    sizing: 'fixed',
    overflow: 'scale',
    minScale: 0.6,
    box: { x, y, width, height: S(150) },
    item: {
      width: S(140),
      height: S(140),
      layers: [
        {
          id: 'circle',
          name: 'Circle',
          kind: 'shape',
          shape: 'ellipse',
          box: { x: 0, y: 0, width: S(140), height: S(140) },
          fill: 'paperLight',
          stroke: 'paperDeep',
          strokeWidth: S(1.5),
        },
        text('weekday', 'Weekday', { x: S(10), y: S(24), width: S(120), height: S(24) }, style({
          font: 'caps', size: S(17), minSize: S(12), weight: 500, tracking: 0.12, uppercase: true, color: 'ink',
        }), { field: 'weekday' }),
        text('date', 'Date', { x: S(8), y: S(48), width: S(124), height: S(40) }, style({
          font: 'display', size: S(31), minSize: S(20), weight: 500, uppercase: true, color: 'ink', lineHeight: 1,
        }), { field: 'date' }),
        text('time', 'Time', { x: S(16), y: S(90), width: S(108), height: S(34) }, style({
          font: 'caps', size: S(12.5), minSize: S(9), weight: 500, color: 'ink', maxLines: 2, lineHeight: 1.3,
        }), { field: 'time' }),
      ],
    },
  }
  layers.push(sessions)
  y += S(150) + G(8)

  add(
    26,
    (top, h) =>
      text('location', 'Location', { x, y: top, width, height: h }, style({
        font: 'caps', size: S(13.5), minSize: S(10), weight: 500, tracking: 0.18, uppercase: true, color: 'inkSoft',
      }), { slot: 'location', hideWhenEmpty: true }),
    10
  )
  add(
    118,
    (top, h) =>
      text('description', 'Description', { x: x + S(8), y: top, width: width - S(16), height: h }, style({
        font: 'caps', size: S(17), minSize: S(12), weight: 400, tracking: 0.04, color: 'ink',
        maxLines: 4, lineHeight: 1.5,
      }), { slot: 'description' }),
    16
  )

  if (spec.pills) {
    const pillWidth = Math.min(S(400), width)
    const pills: RepeaterLayer = {
      id: 'pills',
      name: 'Feature pills',
      kind: 'repeater',
      slot: 'pills',
      direction: 'column',
      gap: S(8),
      align: 'center',
      sizing: 'fixed',
      overflow: 'wrap',
      box: { x: center - pillWidth / 2, y, width: pillWidth, height: S(200) },
      item: {
        width: pillWidth,
        height: S(42),
        layers: [
          {
            id: 'pill',
            name: 'Pill',
            kind: 'shape',
            shape: 'rect',
            box: { x: 0, y: 0, width: pillWidth, height: S(42) },
            fill: 'accentSoft',
            cornerRadius: S(2),
          },
          text('pill_text', 'Pill text', { x: S(10), y: 0, width: pillWidth - S(20), height: S(42) }, style({
            font: 'caps', size: S(13), minSize: S(9), weight: 500, tracking: 0.18, uppercase: true, color: 'ink',
            maxLines: 2, lineHeight: 1.15,
          }), { field: 'item' }),
        ],
      },
    }
    layers.push(pills)
    y += S(200) + G(16)
  }

  add(
    28,
    (top, h) =>
      text('level', 'Level line', { x: x + S(20), y: top, width: width - S(40), height: h }, style({
        font: 'caps', size: S(13.5), minSize: S(10), weight: 500, tracking: 0.24, uppercase: true, color: 'inkSoft',
      }), { slot: 'level', decoration: 'rules', hideWhenEmpty: true }),
    16
  )

  // Bio block: dark panel with "Led by", the script name and credentials.
  const bioX = spec.bioX ?? x
  const bioWidth = spec.bioWidth ?? width
  const bioTop = y
  const bioInner = (dy: number, h: number) => ({
    x: bioX + S(16),
    y: bioTop + S(dy),
    width: bioWidth - S(32),
    height: S(h),
  })
  const bioHeight = spec.credentialSecondary ? 246 : 210
  layers.push({
    id: 'bio_block',
    name: 'Bio block',
    kind: 'shape',
    shape: 'rect',
    box: { x: bioX, y: bioTop, width: bioWidth, height: S(bioHeight) },
    fill: 'darkBlock',
  })
  layers.push(
    text('led_by', 'Led by', bioInner(18, 22), style({
      font: 'caps', size: S(12.5), minSize: S(9), weight: 500, tracking: 0.42, uppercase: true, color: 'onDark',
    }), { slot: 'led_by' })
  )
  layers.push(
    text('signature', 'Signature', bioInner(42, 92), style({
      font: 'script', size: S(64), minSize: S(36), weight: 400, color: 'accent', lineHeight: 1.1,
    }), { slot: 'signature' })
  )
  layers.push(
    text('credential_primary', 'Credential', bioInner(140, 24), style({
      font: 'caps', size: S(14.5), minSize: S(10), weight: 500, tracking: 0.3, uppercase: true, color: 'onDark',
    }), { slot: 'credential_primary' })
  )
  if (spec.credentialSecondary) {
    layers.push(
      text('credential_secondary', 'Credential details', bioInner(172, 52), style({
        font: 'caps', size: S(11), minSize: S(8), weight: 500, tracking: 0.2, uppercase: true, color: 'onDark',
        maxLines: 2, lineHeight: 1.5,
      }), { slot: 'credential_secondary' })
    )
  }
  y = bioTop + S(bioHeight)

  return { layers, bottom: y }
}

function heroLayers(box: Layer['box'], fade: { box: Layer['box']; direction: 'left-right' | 'top-bottom' }): Layer[] {
  return [
    { id: 'hero', name: 'Hero photo', kind: 'photo', slot: 'hero', box, placeholder: 'paperDeep' },
    {
      id: 'hero_fade',
      name: 'Hero fade',
      kind: 'shape',
      shape: 'rect',
      box: fade.box,
      gradient: { from: 'paper', to: 'paper', fromAlpha: 0, toAlpha: 1, direction: fade.direction },
    },
  ]
}

function stripLayer(box: Layer['box'], direction: 'row' | 'column', gap: number, maxVisible: number): RepeaterLayer {
  return {
    id: 'strip',
    name: 'Photo strip',
    kind: 'repeater',
    slot: 'strip',
    direction,
    gap,
    align: 'start',
    sizing: 'fill',
    maxVisible,
    box,
    item: {
      width: direction === 'column' ? box.width : 100,
      height: direction === 'column' ? 100 : box.height,
      layers: [
        {
          id: 'strip_photo',
          name: 'Strip photo',
          kind: 'photo',
          box: {
            x: 0,
            y: 0,
            width: direction === 'column' ? box.width : 100,
            height: direction === 'column' ? 100 : box.height,
          },
          placeholder: 'paperDeep',
        },
      ],
    },
  }
}

function postLayout(): FormatLayout {
  const column = buildColumn({
    x: 444,
    width: 460,
    top: 44,
    s: 1,
    gapScale: 1,
    pills: true,
    credentialSecondary: true,
  })
  return {
    width: 1080,
    height: 1350,
    background: 'paper',
    layers: [
      ...heroLayers(
        { x: 0, y: 0, width: 430, height: 1350 },
        { box: { x: 362, y: 0, width: 70, height: 1350 }, direction: 'left-right' }
      ),
      stripLayer({ x: 916, y: 24, width: 148, height: 1302 }, 'column', 12, 4),
      ...column.layers,
    ],
  }
}

function storyLayout(): FormatLayout {
  // Text stays between y = 250 and y = 1670 (Instagram covers the bands above
  // and below). Photos may run into those bands.
  const column = buildColumn({
    x: 110,
    width: 860,
    top: 708,
    s: 1,
    gapScale: 0.6,
    pills: false,
    credentialSecondary: false,
    bioX: 110,
    bioWidth: 860,
  })
  return {
    width: 1080,
    height: 1920,
    background: 'paper',
    safeArea: { top: 250, bottom: 250 },
    layers: [
      ...heroLayers(
        { x: 0, y: 0, width: 720, height: 690 },
        { box: { x: 0, y: 600, width: 1080, height: 90 }, direction: 'top-bottom' }
      ),
      stripLayer({ x: 732, y: 0, width: 348, height: 690 }, 'column', 12, 3),
      ...column.layers,
    ],
  }
}

function posterLayout(): FormatLayout {
  const column = buildColumn({
    x: 1730,
    width: 1180,
    top: 230,
    s: 3.05,
    gapScale: 2.1,
    pills: true,
    credentialSecondary: true,
  })
  return {
    width: 3300,
    height: 5100,
    background: 'paper',
    layers: [
      ...heroLayers(
        { x: 0, y: 0, width: 1700, height: 5100 },
        { box: { x: 1480, y: 0, width: 230, height: 5100 }, direction: 'left-right' }
      ),
      stripLayer({ x: 2950, y: 90, width: 300, height: 4920 }, 'column', 36, 4),
      ...column.layers,
    ],
  }
}

export function buildPrecisionWorkshopDefinition(): TemplateDefinition {
  return {
    name: 'Precision Workshop',
    slots: PRECISION_WORKSHOP_SLOTS,
    variants: {
      ivory: { label: 'Ivory', remap: {} },
      noir: {
        label: 'Noir',
        remap: {
          paper: 'darkBlock',
          paperLight: 'inkSoft',
          paperDeep: 'inkSoft',
          ink: 'onDark',
          inkSoft: 'paperDeep',
          accentSoft: 'inkSoft',
          darkBlock: 'paper',
          onDark: 'ink',
        },
      },
    },
    defaultVariant: 'ivory',
    formats: {
      ig_post: postLayout(),
      ig_story: storyLayout(),
      poster: posterLayout(),
    },
  }
}
