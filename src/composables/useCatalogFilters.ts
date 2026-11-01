import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  catalogQueryToState,
  catalogStateToQuery,
  sameCatalogQuery,
  type CatalogFilterState,
} from './useCatalogQuery'
import { LEVEL_MAX } from '../presets/constants'
import { usePresets } from '../presets/usePresets'

export type FilterChip = { id: string; label: string; clear: () => void }

const searchText = ref('')
const levelRange = ref<[number, number]>([0, 90])
const charAlignment = ref<string | null>(null)
const charClass = ref<string | null>(null)
const charRace = ref<string | null>(null)
const charGender = ref<string | null>(null)
const itemType = ref<string | null>(null)
const itemClass = ref<string | null>(null)
const itemAffect = ref<string | null>(null)
const itemProperty = ref<string | null>(null)
const itemSlot = ref<string | null>(null)
const itemLayer = ref<string | null>(null)

const applyingRoute = ref(false)
let routeWatchStarted = false
let filterWatchStarted = false
let filterStateHydrated = false

const CATALOG_QUERY_KEYS = new Set([
  'q', 'level', 'align', 'race', 'class', 'gender', 'type', 'itemClass',
  'affect', 'slot', 'layer', 'property', 'weights', 'character', 'w',
  'str', 'int', 'wis', 'dex', 'con',
])

const FILTER_ROUTE_NAMES = new Set(['catalog', 'filters'])

const clampLevel = (n: unknown, fallback: number) => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(LEVEL_MAX, Math.max(0, Math.round(v)))
}

/**
 * Shared catalog filter state (URL-backed). Used by CatalogView, FiltersView,
 * and the sticky nav search so filters survive route changes with keep-alive.
 */
export function useCatalogFilters() {
  const route = useRoute()
  const router = useRouter()
  const {
    activeWeightConfigId,
    activeCharacterProfileId,
    activeWeightConfig,
    activeCharacterProfile,
    weightConfigSelectItems,
    characterProfileSelectItems,
    characterProfiles,
    setUnsavedWeightConfig,
    setUnsavedCharacterProfile,
    clearUnsavedWeightConfig,
    clearUnsavedCharacterProfile,
  } = usePresets()

  const levelMin = computed({
    get: () => levelRange.value[0],
    set: (raw) => {
      const min = clampLevel(raw, levelRange.value[0])
      const max = Math.max(min, levelRange.value[1])
      levelRange.value = [min, max]
    },
  })

  const levelMax = computed({
    get: () => levelRange.value[1],
    set: (raw) => {
      const max = clampLevel(raw, levelRange.value[1])
      const min = Math.min(levelRange.value[0], max)
      levelRange.value = [min, max]
    },
  })

  /** Character profile locks align/race/class/gender until cleared. */
  const characterFiltersLocked = computed(() => !!activeCharacterProfileId.value)

  const queryHas = (key: string) =>
    Object.prototype.hasOwnProperty.call(route.query, key)

  const currentFilterState = (): CatalogFilterState => ({
    searchText: searchText.value,
    levelRange: levelRange.value,
    charAlignment: charAlignment.value,
    charClass: charClass.value,
    charRace: charRace.value,
    charGender: charGender.value,
    itemType: itemType.value,
    itemClass: itemClass.value,
    itemAffect: itemAffect.value,
    itemProperty: itemProperty.value,
    itemSlot: itemSlot.value,
    itemLayer: itemLayer.value,
    activeWeightConfigId: activeWeightConfigId.value,
    activeCharacterProfileId: activeCharacterProfileId.value,
  })

  const pushFilterQuery = () => {
    if (applyingRoute.value) return
    const query = catalogStateToQuery(currentFilterState(), {
      activeProfile: activeCharacterProfile.value,
      activeWeights: activeWeightConfig.value,
    })
    if (sameCatalogQuery(query, route.query)) return
    const name = FILTER_ROUTE_NAMES.has(String(route.name))
      ? (route.name as 'catalog' | 'filters')
      : 'catalog'
    router.replace({ name, query })
  }

  const applyCharacterProfile = (id: string | null) => {
    if (!id) {
      clearUnsavedCharacterProfile()
      const min = levelRange.value[0]
      levelRange.value = [min, 90]
      charAlignment.value = null
      charRace.value = null
      charClass.value = null
      charGender.value = null
      return
    }
    const profile = characterProfiles.value.find((p) => p.id === id)
    if (!profile) return
    const min = levelRange.value[0]
    levelRange.value = [min, Math.max(min, profile.level)]
    charAlignment.value = profile.alignment
    charRace.value = profile.race
    charClass.value = profile.class
    charGender.value = profile.gender
  }

  const clearWeightSelection = () => {
    activeWeightConfigId.value = null
    clearUnsavedWeightConfig()
    itemProperty.value = null
  }

  const onWeightConfigSelected = (id: string | null) => {
    if (id) {
      itemProperty.value = null
      return
    }
    clearWeightSelection()
  }

  const onItemPropertyUpdate = (value: string | null) => {
    if (activeWeightConfig.value) return
    itemProperty.value = value
  }

  const applyQueryToState = () => {
    applyingRoute.value = true
    const partial = catalogQueryToState(route.query)
    searchText.value = partial.searchText ?? ''
    levelRange.value = partial.levelRange ?? [0, 90]
    charAlignment.value = partial.charAlignment ?? null
    charClass.value = partial.charClass ?? null
    charRace.value = partial.charRace ?? null
    charGender.value = partial.charGender ?? null
    itemType.value = partial.itemType ?? null
    itemClass.value = partial.itemClass ?? null
    itemAffect.value = partial.itemAffect ?? null
    itemSlot.value = partial.itemSlot ?? null
    itemLayer.value = partial.itemLayer ?? null

    const hasWeightKeys = queryHas('weights') || queryHas('w')
    const hasPropertyKey = queryHas('property')
    if (partial.sharedWeights) {
      setUnsavedWeightConfig(partial.sharedWeights)
      itemProperty.value = null
    } else if (hasWeightKeys) {
      clearUnsavedWeightConfig()
      activeWeightConfigId.value = partial.activeWeightConfigId ?? null
      itemProperty.value = activeWeightConfigId.value ? null : (partial.itemProperty ?? null)
    } else if (hasPropertyKey) {
      clearUnsavedWeightConfig()
      activeWeightConfigId.value = null
      itemProperty.value = partial.itemProperty ?? null
    } else if (activeWeightConfigId.value) {
      itemProperty.value = null
    } else {
      itemProperty.value = null
    }

    if (partial.wantsUnsavedCharacter) {
      const hi = partial.levelRange?.[1] ?? 50
      setUnsavedCharacterProfile({
        level: hi,
        alignment: partial.charAlignment ?? null,
        race: partial.charRace ?? null,
        class: partial.charClass ?? null,
        gender: partial.charGender ?? null,
        stats: partial.sharedStats,
      })
      applyCharacterProfile(activeCharacterProfileId.value)
    } else if (queryHas('character')) {
      clearUnsavedCharacterProfile()
      activeCharacterProfileId.value = partial.activeCharacterProfileId ?? null
      if (activeCharacterProfileId.value) {
        applyCharacterProfile(activeCharacterProfileId.value)
      }
    } else if (activeCharacterProfileId.value) {
      applyCharacterProfile(activeCharacterProfileId.value)
    }

    queueMicrotask(() => {
      applyingRoute.value = false
      pushFilterQuery()
    })
  }

  const activeFilterChips = computed((): FilterChip[] => {
    const chips: FilterChip[] = []

    if (activeCharacterProfile.value) {
      chips.push({
        id: 'profile',
        label: activeCharacterProfile.value.name,
        clear: () => {
          activeCharacterProfileId.value = null
          applyCharacterProfile(null)
        },
      })
    }

    if (activeWeightConfig.value) {
      chips.push({
        id: 'weights',
        label: activeWeightConfig.value.name,
        clear: () => clearWeightSelection(),
      })
    }

    {
      const [lo, hi] = levelRange.value
      if (lo !== 0 || hi !== 90) {
        chips.push({
          id: 'level',
          label: `Lv ${lo}–${hi}`,
          clear: () => {
            levelRange.value = [0, 90]
          },
        })
      }
    }

    if (!characterFiltersLocked.value) {
      if (charAlignment.value) {
        chips.push({
          id: 'align',
          label: charAlignment.value,
          clear: () => {
            charAlignment.value = null
          },
        })
      }
      if (charRace.value) {
        chips.push({
          id: 'race',
          label: charRace.value,
          clear: () => {
            charRace.value = null
          },
        })
      }
      if (charClass.value) {
        chips.push({
          id: 'class',
          label: charClass.value,
          clear: () => {
            charClass.value = null
          },
        })
      }
      if (charGender.value) {
        chips.push({
          id: 'gender',
          label: charGender.value,
          clear: () => {
            charGender.value = null
          },
        })
      }
    }

    if (itemClass.value) {
      chips.push({
        id: 'itemClass',
        label: itemClass.value,
        clear: () => {
          itemClass.value = null
        },
      })
    } else if (itemType.value) {
      chips.push({
        id: 'itemType',
        label: itemType.value,
        clear: () => {
          itemType.value = null
        },
      })
    }

    if (itemAffect.value) {
      chips.push({
        id: 'affect',
        label: itemAffect.value,
        clear: () => {
          itemAffect.value = null
        },
      })
    }

    if (itemSlot.value || itemLayer.value) {
      const parts = [itemSlot.value, itemLayer.value].filter(Boolean)
      chips.push({
        id: 'wear',
        label: parts.join('.'),
        clear: () => {
          itemSlot.value = null
          itemLayer.value = null
        },
      })
    }

    if (!activeWeightConfig.value && itemProperty.value) {
      chips.push({
        id: 'property',
        label: itemProperty.value,
        clear: () => {
          itemProperty.value = null
        },
      })
    }

    return chips
  })

  const routeHasCatalogQuery = () =>
    Object.keys(route.query).some((k) => CATALOG_QUERY_KEYS.has(k))

  /** Idempotent: wire URL ↔ state watchers once; hydrate from query when present. */
  const ensureFilterSync = () => {
    if (!filterWatchStarted) {
      filterWatchStarted = true
      watch(
        [
          searchText,
          levelRange,
          charAlignment,
          charClass,
          charRace,
          charGender,
          itemType,
          itemClass,
          itemAffect,
          itemProperty,
          itemSlot,
          itemLayer,
          activeWeightConfigId,
          activeCharacterProfileId,
        ],
        () => {
          pushFilterQuery()
        },
        { deep: true },
      )
    }

    if (!routeWatchStarted) {
      routeWatchStarted = true
      watch(
        () => [route.name, route.query] as const,
        () => {
          if (!FILTER_ROUTE_NAMES.has(String(route.name))) return
          const query = catalogStateToQuery(currentFilterState())
          if (sameCatalogQuery(query, route.query)) return
          applyQueryToState()
        },
      )
    }

    if (filterStateHydrated) return
    filterStateHydrated = true
    if (routeHasCatalogQuery()) {
      applyQueryToState()
    } else {
      pushFilterQuery()
    }
  }

  const openFiltersPage = () => {
    router.push({ name: 'filters', query: route.query })
  }

  const toggleFiltersPage = () => {
    if (route.name === 'filters') {
      router.push({ name: 'catalog', query: route.query })
      return
    }
    openFiltersPage()
  }

  const openWeightsManager = () => {
    router.push({
      name: 'weights',
      params: activeWeightConfigId.value ? { id: activeWeightConfigId.value } : {},
      query: route.query,
    })
  }

  const openCharactersManager = () => {
    router.push({
      name: 'characters',
      params: activeCharacterProfileId.value ? { id: activeCharacterProfileId.value } : {},
      query: route.query,
    })
  }

  const filtersPageActive = computed(() => route.name === 'filters')

  return {
    searchText,
    levelRange,
    levelMin,
    levelMax,
    charAlignment,
    charClass,
    charRace,
    charGender,
    itemType,
    itemClass,
    itemAffect,
    itemProperty,
    itemSlot,
    itemLayer,
    characterFiltersLocked,
    activeFilterChips,
    activeWeightConfigId,
    activeCharacterProfileId,
    activeWeightConfig,
    activeCharacterProfile,
    weightConfigSelectItems,
    characterProfileSelectItems,
    filtersPageActive,
    ensureFilterSync,
    applyCharacterProfile,
    onWeightConfigSelected,
    onItemPropertyUpdate,
    clearWeightSelection,
    openFiltersPage,
    toggleFiltersPage,
    openWeightsManager,
    openCharactersManager,
    currentFilterState,
    pushFilterQuery,
  }
}
