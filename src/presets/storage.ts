import {
  DEFAULT_STAT_VALUE,
  LEVEL_MAX,
  LEVEL_MIN,
  STAT_MAX,
  STAT_MIN,
  UNSAVED_PRESET_ID,
} from './constants'
import type {
  CharacterProfile,
  CharacterStats,
  PresetsState,
  WeightConfig,
} from './types'
import { DEFAULT_CHARACTER_STATS } from './types'

/** Legacy unscoped key (pre channel-namespace); migrated once into prod `/tfecat/` key. */
export const LEGACY_PRESETS_STORAGE_KEY = 'tfecat.presets.v1'

/** Channel slug from Vite base (`/tfecat/` → `tfecat`, `/tcat-preview/` → `tcat-preview`). */
export function presetsChannelSlug(baseUrl = import.meta.env.BASE_URL): string {
  const trimmed = String(baseUrl || '/').replace(/^\/+|\/+$/g, '')
  return trimmed || 'dev'
}

/** Per-channel key so prod + preview PWAs on njs50.github.io don’t share presets. */
export function presetsStorageKey(baseUrl = import.meta.env.BASE_URL): string {
  return `tfecat.presets.v1:${presetsChannelSlug(baseUrl)}`
}

export const PRESETS_STORAGE_KEY = presetsStorageKey()

/** Shared baseline weights for the built-in class starter profiles. */
const BASE_CLASS_WEIGHTS: Record<string, number> = {
  Dexterity: 150,
  Deflection: 10,
  'Global Armor': 18,
  'Armor Class': 2,
  resist: 7,
  Constitution: 150,
  Wisdom: 30,
  Move_regen: 15,
}

/** Built-in starter configs (always injected; not editable in place). */
export const DEFAULT_WEIGHT_CONFIGS: WeightConfig[] = [
  {
    id: 'default-fighter',
    name: 'Fighter',
    builtin: true,
    weights: {
      ...BASE_CLASS_WEIGHTS,
      Damroll: 100,
      Hitroll: 45,
      Strength: 60,
      Hit_points: 8,
    },
  },
  {
    id: 'default-healer',
    name: 'Healer',
    builtin: true,
    weights: {
      ...BASE_CLASS_WEIGHTS,
      Damroll: 50,
      Hitroll: 24,
      Strength: 40,
      Intelligence: 150,
      Mana_regen: 125,
      Hit_points: 8,
      Mana_points: 4,
    },
  },
  {
    id: 'default-wizard',
    name: 'Wizard',
    builtin: true,
    weights: {
      ...BASE_CLASS_WEIGHTS,
      Strength: 40,
      Intelligence: 150,
      Mana_regen: 125,
      Hit_points: 15,
      Mana_points: 4,
    },
  },
]

/** Ids of current + legacy built-in weight configs (legacy examples are dropped on load). */
export const BUILTIN_WEIGHT_CONFIG_IDS = new Set([
  ...DEFAULT_WEIGHT_CONFIGS.map((c) => c.id),
  'default-reaver',
  'default-cleric',
])

export function isBuiltinWeightConfigId(id: string): boolean {
  return BUILTIN_WEIGHT_CONFIG_IDS.has(id)
}

/** Fresh builtins first, then user configs (never store/edit builtins in place). */
export function mergeBuiltinWeightConfigs(configs: WeightConfig[]): WeightConfig[] {
  const builtins = structuredClone(DEFAULT_WEIGHT_CONFIGS)
  const user = configs.filter(
    (c) => !isBuiltinWeightConfigId(c.id) && !c.builtin && c.id !== UNSAVED_PRESET_ID,
  )
  const unsaved = configs.find((c) => c.id === UNSAVED_PRESET_ID)
  return unsaved ? [...builtins, ...user, unsaved] : [...builtins, ...user]
}

const emptyState = (): PresetsState => ({
  weightConfigs: structuredClone(DEFAULT_WEIGHT_CONFIGS),
  characterProfiles: [],
  activeWeightConfigId: null,
  activeCharacterProfileId: null,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeWeights(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) {
    return {}
  }
  const weights: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    const n = typeof value === 'number' ? value : Number(value)
    if (key && Number.isFinite(n)) {
      weights[key] = n
    }
  }
  return weights
}

function sanitizeWeightConfig(raw: unknown): WeightConfig | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    return null
  }
  if (raw.id === UNSAVED_PRESET_ID) {
    return null
  }
  // Built-ins come from code only — drop any stored copy (including legacy examples).
  if (isBuiltinWeightConfigId(raw.id) || raw.builtin === true) {
    return null
  }
  return {
    id: raw.id,
    name: raw.name,
    weights: sanitizeWeights(raw.weights),
  }
}

function sanitizeStat(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_STAT_VALUE
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) {
    return DEFAULT_STAT_VALUE
  }
  return Math.min(STAT_MAX, Math.max(STAT_MIN, Math.round(n)))
}

function sanitizeCharacterStats(raw: unknown): CharacterStats {
  if (!isRecord(raw)) {
    return { ...DEFAULT_CHARACTER_STATS }
  }
  return {
    Str: sanitizeStat(raw.Str),
    Int: sanitizeStat(raw.Int),
    Wis: sanitizeStat(raw.Wis),
    Dex: sanitizeStat(raw.Dex),
    Con: sanitizeStat(raw.Con),
  }
}

function sanitizeCharacterProfile(raw: unknown): CharacterProfile | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    return null
  }
  if (raw.id === UNSAVED_PRESET_ID) {
    return null
  }
  const level = typeof raw.level === 'number' ? raw.level : Number(raw.level)
  if (!Number.isFinite(level)) {
    return null
  }
  const nullableString = (v: unknown): string | null =>
    typeof v === 'string' && v.length ? v : null
  const equipmentPaste =
    typeof raw.equipmentPaste === 'string' && raw.equipmentPaste.length
      ? raw.equipmentPaste
      : undefined
  return {
    id: raw.id,
    name: raw.name,
    level: Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(level))),
    alignment: nullableString(raw.alignment),
    race: nullableString(raw.race),
    class: nullableString(raw.class),
    gender: nullableString(raw.gender),
    stats: sanitizeCharacterStats(raw.stats),
    ...(equipmentPaste ? { equipmentPaste } : {}),
  }
}

function parsePresetsRaw(raw: string | null): PresetsState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return null
    const weightConfigs = Array.isArray(parsed.weightConfigs)
      ? parsed.weightConfigs.map(sanitizeWeightConfig).filter((c): c is WeightConfig => !!c)
      : []
    const characterProfiles = Array.isArray(parsed.characterProfiles)
      ? parsed.characterProfiles
          .map(sanitizeCharacterProfile)
          .filter((c): c is CharacterProfile => !!c)
      : []
    return {
      weightConfigs: mergeBuiltinWeightConfigs(weightConfigs),
      characterProfiles,
      activeWeightConfigId:
        typeof parsed.activeWeightConfigId === 'string' ? parsed.activeWeightConfigId : null,
      activeCharacterProfileId:
        typeof parsed.activeCharacterProfileId === 'string'
          ? parsed.activeCharacterProfileId
          : null,
    }
  } catch {
    return null
  }
}

export function loadPresetsState(): PresetsState {
  if (typeof localStorage === 'undefined') {
    return emptyState()
  }
  const key = presetsStorageKey()
  const scoped = parsePresetsRaw(localStorage.getItem(key))
  if (scoped) return scoped

  // One-time migrate unscoped prod data into `/tfecat/` only (not preview).
  if (presetsChannelSlug() === 'tfecat') {
    const legacy = parsePresetsRaw(localStorage.getItem(LEGACY_PRESETS_STORAGE_KEY))
    if (legacy) {
      localStorage.setItem(key, JSON.stringify(legacy))
      return legacy
    }
  }

  return emptyState()
}

export function savePresetsState(state: PresetsState): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  // Never persist built-ins — they are always re-injected from code on load.
  const toStore: PresetsState = {
    ...state,
    weightConfigs: state.weightConfigs.filter(
      (c) => !isBuiltinWeightConfigId(c.id) && !c.builtin && c.id !== UNSAVED_PRESET_ID,
    ),
  }
  localStorage.setItem(presetsStorageKey(), JSON.stringify(toStore))
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
