import { computed, ref, watch } from 'vue'
import { loadPresetsState, newId, savePresetsState } from './storage'
import { EMPTY_CHARACTER_STATS } from './types'
import type { CharacterProfile, WeightConfig } from './types'

const state = loadPresetsState()

const weightConfigs = ref<WeightConfig[]>(state.weightConfigs)
const characterProfiles = ref<CharacterProfile[]>(state.characterProfiles)
const activeWeightConfigId = ref<string | null>(state.activeWeightConfigId)
const activeCharacterProfileId = ref<string | null>(state.activeCharacterProfileId)

watch(
  [weightConfigs, characterProfiles, activeWeightConfigId, activeCharacterProfileId],
  () => {
    savePresetsState({
      weightConfigs: weightConfigs.value,
      characterProfiles: characterProfiles.value,
      activeWeightConfigId: activeWeightConfigId.value,
      activeCharacterProfileId: activeCharacterProfileId.value,
    })
  },
  { deep: true },
)

export function usePresets() {
  const activeWeightConfig = computed(() => {
    const id = activeWeightConfigId.value
    if (!id) {
      return null
    }
    return weightConfigs.value.find((c) => c.id === id) ?? null
  })

  const activeCharacterProfile = computed(() => {
    const id = activeCharacterProfileId.value
    if (!id) {
      return null
    }
    return characterProfiles.value.find((c) => c.id === id) ?? null
  })

  const weightConfigSelectItems = computed(() =>
    weightConfigs.value
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((c) => ({ title: c.name, value: c.id })),
  )

  const characterProfileSelectItems = computed(() =>
    characterProfiles.value
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((c) => ({ title: c.name, value: c.id })),
  )

  const upsertWeightConfig = (config: WeightConfig) => {
    const idx = weightConfigs.value.findIndex((c) => c.id === config.id)
    if (idx >= 0) {
      weightConfigs.value.splice(idx, 1, config)
    } else {
      weightConfigs.value.push(config)
    }
  }

  const deleteWeightConfig = (id: string) => {
    weightConfigs.value = weightConfigs.value.filter((c) => c.id !== id)
    if (activeWeightConfigId.value === id) {
      activeWeightConfigId.value = null
    }
  }

  const upsertCharacterProfile = (profile: CharacterProfile) => {
    const idx = characterProfiles.value.findIndex((c) => c.id === profile.id)
    if (idx >= 0) {
      characterProfiles.value.splice(idx, 1, profile)
    } else {
      characterProfiles.value.push(profile)
    }
  }

  const deleteCharacterProfile = (id: string) => {
    characterProfiles.value = characterProfiles.value.filter((c) => c.id !== id)
    if (activeCharacterProfileId.value === id) {
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
    stats: { ...EMPTY_CHARACTER_STATS },
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
    createEmptyWeightConfig,
    createEmptyCharacterProfile,
  }
}
