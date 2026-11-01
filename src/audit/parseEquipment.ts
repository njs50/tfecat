/**
 * Port of Mudlet "parse equipment" trigger (tfecat.xml).
 *
 * Format:
 * ```
 *      +++ Equipment +++
 * worn on body              under  a flaming iron breastplate   excellent
 *                           over   a cloak of shadows           good
 * worn around neck          base   a shell necklace             perfect
 * ```
 */

export const EQUIPMENT_LAYERS = ['bottom', 'under', 'base', 'over', 'top'] as const
export type EquipmentLayer = (typeof EQUIPMENT_LAYERS)[number]

export const EQUIPMENT_CONDITIONS = [
  'worthless',
  'damaged',
  'very worn',
  'worn',
  'very scratch',
  'scratched',
  'reasonable',
  'good',
  'very good',
  'excellent',
  'perfect',
] as const

export type ParsedGearPiece = {
  slot: string
  layer: EquipmentLayer
  raw: string
  condition: string
}

export type ParseEquipmentResult = {
  /** slot → layer → piece */
  gear: Record<string, Partial<Record<EquipmentLayer, ParsedGearPiece>>>
  pieces: ParsedGearPiece[]
  started: boolean
  errors: string[]
}

const HEADER_RE = /^\s*\+\+\+\s*Equipment\s*\+\+\+\s*$/i
const LINE_RE = new RegExp(
  `^(.*?)\\s+(${EQUIPMENT_LAYERS.join('|')})\\s+(.*?)\\s+(${EQUIPMENT_CONDITIONS.join('|')})\\s*$`,
  'i',
)
const SLOT_PREFIX_RE = /^(floating|worn on|worn around|worn about)\s+/i

/** Mudlet equipment slot labels after prefix strip. */
export const EQUIPMENT_SLOTS = [
  'right hand',
  'left hand',
  'left hand finger',
  'right hand finger',
  'right wrist',
  'left wrist',
  'head',
  'body',
  'nearby',
  'arms',
  'hands',
  'feet',
  'legs',
  'waist',
  'neck',
] as const

/** Map Mudlet equipment slot → catalog `Wear Loc.` token. */
export const SLOT_TO_WEAR_LOC: Record<string, string> = {
  waist: 'waist',
  'left hand finger': 'finger',
  head: 'head',
  neck: 'neck',
  'right hand': 'right_hand',
  'left hand': 'left_hand',
  nearby: 'float_nearby',
  body: 'body',
  'right hand finger': 'finger',
  finger: 'finger',
  'right wrist': 'wrist',
  arms: 'arms',
  hands: 'hands',
  feet: 'feet',
  legs: 'legs',
  'left wrist': 'wrist',
  wrist: 'wrist',
}

export function parseEquipmentPaste(text: string): ParseEquipmentResult {
  const gear: ParseEquipmentResult['gear'] = {}
  const pieces: ParsedGearPiece[] = []
  const errors: string[] = []
  let started = false
  let currentSlot: string | null = null

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    if (HEADER_RE.test(line)) {
      started = true
      currentSlot = null
      continue
    }
    // Allow pastes that omit the header — still try to parse gear lines.
    const m = line.match(LINE_RE)
    if (!m) {
      if (started && line.trim()) {
        errors.push(`Unparsed line: ${line.trim()}`)
      }
      continue
    }

    started = true
    const slotRaw = (m[1] ?? '').trim()
    const layer = m[2].toLowerCase() as EquipmentLayer
    const raw = (m[3] ?? '').trim()
    const condition = (m[4] ?? '').toLowerCase()

    if (slotRaw) {
      currentSlot = slotRaw.replace(SLOT_PREFIX_RE, '').trim().toLowerCase()
    }
    if (!currentSlot) {
      errors.push(`Missing slot for: ${raw}`)
      continue
    }

    const piece: ParsedGearPiece = {
      slot: currentSlot,
      layer,
      raw,
      condition,
    }
    gear[currentSlot] = gear[currentSlot] ?? {}
    gear[currentSlot][layer] = piece
    pieces.push(piece)
  }

  return { gear, pieces, started, errors }
}
