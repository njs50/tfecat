import type { CharacterProfile, PresetsState, WeightConfig } from './types'

export const PRESETS_STORAGE_KEY = 'tfecat.presets.v1'

/** Example configs so a fresh browser has something to try. */
export const DEFAULT_WEIGHT_CONFIGS: WeightConfig[] = [
  {
    id: 'default-reaver',
    name: 'reaver',
    weights: {
      Damroll: 2,
      Hitroll: 1,
      Hit_points: 0.1,
    },
  },
  {
    id: 'default-cleric',
    name: 'cleric',
    weights: {
      Mana_regen: 2,
      Restoration: 5,
    },
  },
]

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
  return {
    id: raw.id,
    name: raw.name,
    weights: sanitizeWeights(raw.weights),
  }
}

function sanitizeCharacterProfile(raw: unknown): CharacterProfile | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    return null
  }
  const level = typeof raw.level === 'number' ? raw.level : Number(raw.level)
  if (!Number.isFinite(level)) {
    return null
  }
  const nullableString = (v: unknown): string | null =>
    typeof v === 'string' && v.length ? v : null
  return {
    id: raw.id,
    name: raw.name,
    level: Math.min(90, Math.max(1, Math.round(level))),
    alignment: nullableString(raw.alignment),
    race: nullableString(raw.race),
    class: nullableString(raw.class),
    gender: nullableString(raw.gender),
  }
}

export function loadPresetsState(): PresetsState {
  if (typeof localStorage === 'undefined') {
    return emptyState()
  }
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY)
    if (!raw) {
      return emptyState()
    }
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return emptyState()
    }
    const weightConfigs = Array.isArray(parsed.weightConfigs)
      ? parsed.weightConfigs.map(sanitizeWeightConfig).filter((c): c is WeightConfig => !!c)
      : []
    const characterProfiles = Array.isArray(parsed.characterProfiles)
      ? parsed.characterProfiles
          .map(sanitizeCharacterProfile)
          .filter((c): c is CharacterProfile => !!c)
      : []
    return {
      weightConfigs: weightConfigs.length ? weightConfigs : structuredClone(DEFAULT_WEIGHT_CONFIGS),
      characterProfiles,
      activeWeightConfigId:
        typeof parsed.activeWeightConfigId === 'string' ? parsed.activeWeightConfigId : null,
      activeCharacterProfileId:
        typeof parsed.activeCharacterProfileId === 'string'
          ? parsed.activeCharacterProfileId
          : null,
    }
  } catch {
    return emptyState()
  }
}

export function savePresetsState(state: PresetsState): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(state))
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
