/**
 * Port of Mudlet "parse equipment" trigger (tfecat.xml), plus paste cleanup
 * for wrapped conditions, highlight notices, and inventory header/footer.
 *
 * Format (typical Mudlet `equipment` dump):
 * ```
 *      +++ Equipment +++
 * ---- --------      -----   ----                                       ---------
 * worn on body              under  a flaming iron breastplate   excellent
 *                           over   a cloak of shadows           good
 * worn about body           base   a leather sack labeled meat
 *                          excellent
 * Weight: 12.50 lbs
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

/** Column rule under `+++ Equipment +++` — start of real gear rows. */
const RULE_RE =
  /^\s*-{3,}\s+-{3,}(?:\s+-{3,})+\s*$/

const WEIGHT_FOOTER_RE = /^\s*Weight:\s*\d+\.\d+\s*lbs\s*$/i
/** Highlight / notice lines like `  [something]  ` */
const BRACKET_NOTICE_RE = /^\s+\[.*\]\s*$/
const HEADER_RE = /^\s*\+\+\+\s*Equipment\s*\+\+\+\s*$/i

const LAYER_ALT = EQUIPMENT_LAYERS.join('|')
const CONDITION_ALT = EQUIPMENT_CONDITIONS.join('|')

/** Full row: slot? layer item  (≥2 spaces)  condition */
const LINE_WITH_CONDITION_RE = new RegExp(
  `^(.*?)\\s+(${LAYER_ALT})\\s+(.+?)\\s{2,}(${CONDITION_ALT})\\s*$`,
  'i',
)

/** Row missing condition (wrapped onto the next line). */
const LINE_WITHOUT_CONDITION_RE = new RegExp(
  `^(.*?)\\s+(${LAYER_ALT})\\s+(.+?)\\s*$`,
  'i',
)

const CONDITION_ONLY_RE = new RegExp(`^\\s*(${CONDITION_ALT})\\s*$`, 'i')

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

function looksLikeLayerRow(line: string): boolean {
  return new RegExp(`\\s+(${LAYER_ALT})\\s+`, 'i').test(line)
}

export function parseEquipmentPaste(text: string): ParseEquipmentResult {
  const gear: ParseEquipmentResult['gear'] = {}
  const pieces: ParsedGearPiece[] = []
  const errors: string[] = []
  let started = false
  let pastRule = false
  let currentSlot: string | null = null

  const lines = text.replace(/\r\n/g, '\n').split('\n')

  const addPiece = (
    slotRaw: string,
    layer: string,
    raw: string,
    condition: string,
  ) => {
    if (slotRaw.trim()) {
      currentSlot = slotRaw.replace(SLOT_PREFIX_RE, '').trim().toLowerCase()
    }
    if (!currentSlot) {
      errors.push(`Missing slot for: ${raw}`)
      return
    }
    const piece: ParsedGearPiece = {
      slot: currentSlot,
      layer: layer.toLowerCase() as EquipmentLayer,
      raw: raw.trim(),
      condition: condition.toLowerCase(),
    }
    gear[currentSlot] = gear[currentSlot] ?? {}
    gear[currentSlot][piece.layer] = piece
    pieces.push(piece)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Stop at inventory weight footer.
    if (WEIGHT_FOOTER_RE.test(line)) break

    // Ignore highlight / notice lines: spaces + [anything]
    if (BRACKET_NOTICE_RE.test(line)) continue

    if (HEADER_RE.test(line)) {
      // Still wait for the column rule before accepting rows.
      continue
    }

    if (RULE_RE.test(line)) {
      pastRule = true
      started = true
      currentSlot = null
      continue
    }

    // Ignore everything before the header rule line.
    if (!pastRule) continue

    if (BRACKET_NOTICE_RE.test(line)) continue

    const withCond = line.match(LINE_WITH_CONDITION_RE)
    if (withCond) {
      addPiece(withCond[1] ?? '', withCond[2], withCond[3], withCond[4])
      continue
    }

    // Condition wrapped to the next line (no ≥2 spaces before a trailing condition).
    const withoutCond = line.match(LINE_WITHOUT_CONDITION_RE)
    if (withoutCond && looksLikeLayerRow(line)) {
      let j = i + 1
      while (j < lines.length && (!lines[j].trim() || BRACKET_NOTICE_RE.test(lines[j]))) {
        j++
      }
      const next = j < lines.length ? lines[j] : ''
      const condOnly = next.match(CONDITION_ONLY_RE)
      if (condOnly) {
        addPiece(withoutCond[1] ?? '', withoutCond[2], withoutCond[3], condOnly[1])
        i = j
        continue
      }
    }

    if (started && line.trim() && !CONDITION_ONLY_RE.test(line)) {
      errors.push(`Unparsed line: ${line.trim()}`)
    }
  }

  // Fallback: paste without the column rule — try parsing all non-footer lines.
  if (!pastRule && pieces.length === 0) {
    currentSlot = null
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      if (WEIGHT_FOOTER_RE.test(line)) break
      if (BRACKET_NOTICE_RE.test(line) || HEADER_RE.test(line) || RULE_RE.test(line)) continue

      const withCond = line.match(LINE_WITH_CONDITION_RE)
      if (withCond) {
        started = true
        addPiece(withCond[1] ?? '', withCond[2], withCond[3], withCond[4])
        continue
      }
      const withoutCond = line.match(LINE_WITHOUT_CONDITION_RE)
      if (withoutCond && looksLikeLayerRow(line)) {
        let j = i + 1
        while (j < lines.length && (!lines[j].trim() || BRACKET_NOTICE_RE.test(lines[j]))) {
          j++
        }
        const next = j < lines.length ? lines[j] : ''
        const condOnly = next.match(CONDITION_ONLY_RE)
        if (condOnly) {
          started = true
          addPiece(withoutCond[1] ?? '', withoutCond[2], withoutCond[3], condOnly[1])
          i = j
        }
      }
    }
  }

  return { gear, pieces, started, errors }
}
