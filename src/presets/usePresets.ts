import { computed, ref, watch } from 'vue'
import {
  isBuiltinWeightConfigId,
  loadPresetsState,
  mergeBuiltinWeightConfigs,
  newId,
  savePresetsState,
} from './storage'
import {
  DEFAULT_STAT_VALUE,
  UNSAVED_PRESET_ID,
  UNSAVED_PRESET_LABEL,
} from './constants'
import { DEFAULT_CHARACTER_STATS } from './types'
import type { CharacterProfile, CharacterStats, WeightConfig } from './types'

const state = loadPresetsState()

const weightConfigs = ref<WeightConfig[]>(
  mergeBuiltinWeightConfigs(state.weightConfigs.filter((c) => c.id !== UNSAVED_PRESET_ID)),
)
const characterProfiles = ref<CharacterProfile[]>(
  state.characterProfiles.filter((c) => c.id !== UNSAVED_PRESET_ID),
)

/** Drop missing / &lt;unsaved&gt; ids so sticky actives never point at ghosts. */
const resolveStickyId = (
  id: string | null,
  configs: { id: string }[],
): string | null => {
  if (!id || id === UNSAVED_PRESET_ID) return null
  return configs.some((c) => c.id === id) ? id : null
}

const activeWeightConfigId = ref<string | null>(
  resolveStickyId(state.activeWeightConfigId, weightConfigs.value),
)
const activeCharacterProfileId = ref<string | null>(
  resolveStickyId(state.activeCharacterProfileId, characterProfiles.value),
)

watch(
  [weightConfigs, characterProfiles, activeWeightConfigId, activeCharacterProfileId],
  () => {
    savePresetsState({
      weightConfigs: weightConfigs.value.filter((c) => c.id !== UNSAVED_PRESET_ID),
      characterProfiles: characterProfiles.value.filter((c) => c.id !== UNSAVED_PRESET_ID),
      activeWeightConfigId:
        activeWeightConfigId.value === UNSAVED_PRESET_ID
          ? null
          : activeWeightConfigId.value,
      activeCharacterProfileId:
        activeCharacterProfileId.value === UNSAVED_PRESET_ID
          ? null
          : activeCharacterProfileId.value,
    })
  },
  { deep: true },
)

export function usePresets() {
  const activeWeightConfig = computed(() => {
    const id = activeWeightConfigId.value
    if (!id) return null
    return weightConfigs.value.find((c) => c.id === id) ?? null
  })

  const activeCharacterProfile = computed(() => {
    const id = activeCharacterProfileId.value
    if (!id) return null
    return characterProfiles.value.find((c) => c.id === id) ?? null
  })

  const weightConfigSelectItems = computed(() => {
    const items = weightConfigs.value
      .filter((c) => c.id !== UNSAVED_PRESET_ID)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((c) => ({ title: c.name, value: c.id }))
    const unsaved = weightConfigs.value.find((c) => c.id === UNSAVED_PRESET_ID)
    if (unsaved) {
      items.unshift({ title: UNSAVED_PRESET_LABEL, value: UNSAVED_PRESET_ID })
    }
    return items
  })

  const characterProfileSelectItems = computed(() => {
    const items = characterProfiles.value
      .filter((c) => c.id !== UNSAVED_PRESET_ID)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((c) => ({ title: c.name, value: c.id }))
    const unsaved = characterProfiles.value.find((c) => c.id === UNSAVED_PRESET_ID)
    if (unsaved) {
      items.unshift({ title: UNSAVED_PRESET_LABEL, value: UNSAVED_PRESET_ID })
    }
    return items
  })

  const upsertWeightConfig = (config: WeightConfig) => {
    const cleaned: WeightConfig = {
      ...config,
      weights: { ...config.weights },
      builtin: undefined,
    }
    // Saving a named config from &lt;unsaved&gt; promotes it to a real id.
    if (cleaned.id === UNSAVED_PRESET_ID && cleaned.name.trim() !== UNSAVED_PRESET_LABEL) {
      cleaned.id = newId()
      weightConfigs.value = weightConfigs.value.filter((c) => c.id !== UNSAVED_PRESET_ID)
    }
    // Built-ins are immutable — rename + save always forks a user copy.
    if (isBuiltinWeightConfigId(cleaned.id) || config.builtin) {
      cleaned.id = newId()
    }
    const idx = weightConfigs.value.findIndex((c) => c.id === cleaned.id)
    if (idx >= 0) {
      weightConfigs.value.splice(idx, 1, cleaned)
    } else {
      weightConfigs.value.push(cleaned)
    }
    return cleaned
  }

  const deleteWeightConfig = (id: string) => {
    if (isBuiltinWeightConfigId(id)) return
    weightConfigs.value = weightConfigs.value.filter((c) => c.id !== id)
    if (activeWeightConfigId.value === id) {
      activeWeightConfigId.value = null
    }
  }

  const upsertCharacterProfile = (profile: CharacterProfile) => {
    const cleaned = { ...profile, stats: { ...profile.stats } }
    if (cleaned.id === UNSAVED_PRESET_ID && cleaned.name.trim() !== UNSAVED_PRESET_LABEL) {
      cleaned.id = newId()
      characterProfiles.value = characterProfiles.value.filter((c) => c.id !== UNSAVED_PRESET_ID)
    }
    const idx = characterProfiles.value.findIndex((c) => c.id === cleaned.id)
    if (idx >= 0) {
      characterProfiles.value.splice(idx, 1, cleaned)
    } else {
      characterProfiles.value.push(cleaned)
    }
    return cleaned
  }

  const deleteCharacterProfile = (id: string) => {
    characterProfiles.value = characterProfiles.value.filter((c) => c.id !== id)
    if (activeCharacterProfileId.value === id) {
      activeCharacterProfileId.value = null
    }
  }

  const setUnsavedWeightConfig = (weights: Record<string, number>) => {
    const config: WeightConfig = {
      id: UNSAVED_PRESET_ID,
      name: UNSAVED_PRESET_LABEL,
      weights: { ...weights },
    }
    const idx = weightConfigs.value.findIndex((c) => c.id === UNSAVED_PRESET_ID)
    if (idx >= 0) {
      weightConfigs.value.splice(idx, 1, config)
    } else {
      weightConfigs.value.push(config)
    }
    activeWeightConfigId.value = UNSAVED_PRESET_ID
    return config
  }

  const setUnsavedCharacterProfile = (partial: {
    level: number
    alignment: string | null
    race: string | null
    class: string | null
    gender: string | null
    stats?: Partial<CharacterStats> | null
  }) => {
    const stats: CharacterStats = {
      Str: partial.stats?.Str ?? DEFAULT_STAT_VALUE,
      Int: partial.stats?.Int ?? DEFAULT_STAT_VALUE,
      Wis: partial.stats?.Wis ?? DEFAULT_STAT_VALUE,
      Dex: partial.stats?.Dex ?? DEFAULT_STAT_VALUE,
      Con: partial.stats?.Con ?? DEFAULT_STAT_VALUE,
    }
    const profile: CharacterProfile = {
      id: UNSAVED_PRESET_ID,
      name: UNSAVED_PRESET_LABEL,
      level: partial.level,
      alignment: partial.alignment,
      race: partial.race,
      class: partial.class,
      gender: partial.gender,
      stats,
    }
    const idx = characterProfiles.value.findIndex((c) => c.id === UNSAVED_PRESET_ID)
    if (idx >= 0) {
      characterProfiles.value.splice(idx, 1, profile)
    } else {
      characterProfiles.value.push(profile)
    }
    activeCharacterProfileId.value = UNSAVED_PRESET_ID
    return profile
  }

  const clearUnsavedWeightConfig = () => {
    weightConfigs.value = weightConfigs.value.filter((c) => c.id !== UNSAVED_PRESET_ID)
    if (activeWeightConfigId.value === UNSAVED_PRESET_ID) {
      activeWeightConfigId.value = null
    }
  }

  const clearUnsavedCharacterProfile = () => {
    characterProfiles.value = characterProfiles.value.filter((c) => c.id !== UNSAVED_PRESET_ID)
    if (activeCharacterProfileId.value === UNSAVED_PRESET_ID) {
      activeCharacterProfileId.value = null
    }
  }

  const createEmptyWeightConfig = (): WeightConfig => ({
    id: newId(),
    name: 'New weights',
    weights: {},
  })

  const createEmptyCharacterProfile = (): CharacterProfile => ({
    id: newId(),
    name: 'New character',
    level: 50,
    alignment: null,
    race: null,
    class: null,
    gender: null,
    stats: { ...DEFAULT_CHARACTER_STATS },
  })

  return {
    weightConfigs,
    characterProfiles,
    activeWeightConfigId,
    activeCharacterProfileId,
    activeWeightConfig,
    activeCharacterProfile,
    weightConfigSelectItems,
    characterProfileSelectItems,
    upsertWeightConfig,
    deleteWeightConfig,
    upsertCharacterProfile,
    deleteCharacterProfile,
    setUnsavedWeightConfig,
    setUnsavedCharacterProfile,
    clearUnsavedWeightConfig,
    clearUnsavedCharacterProfile,
    createEmptyWeightConfig,
    createEmptyCharacterProfile,
  }
}
