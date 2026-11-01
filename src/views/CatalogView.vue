<template>
  <!-- Fills viewport under sticky nav; brand above can still scroll away. -->
  <v-container fluid class="content-shell catalog-shell px-6 px-sm-8 pt-4 pb-0">
    <v-card class="catalog-card" elevation="0">
      <v-card-title class="catalog-toolbar pa-3 ga-2">
        <div class="filter-chips">
          <v-chip
            v-for="chip in activeFilterChips"
            :key="chip.id"
            size="small"
            variant="tonal"
            closable
            @click:close="chip.clear()"
          >
            {{ chip.label }}
          </v-chip>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          icon
          variant="tonal"
          density="comfortable"
          :color="filtersOpen ? 'primary' : undefined"
          :aria-pressed="filtersOpen"
          aria-label="Toggle filters"
          @click="filtersOpen = !filtersOpen"
        >
          <v-icon>mdi-filter-variant</v-icon>
        </v-btn>
        <v-text-field
          v-model="searchText"
          append-inner-icon="mdi-magnify"
          label="Search items"
          single-line
          hide-details
          clearable
          density="compact"
          variant="outlined"
          class="search-field"
        ></v-text-field>
      </v-card-title>

      <div
        ref="catalogScrollBody"
        class="catalog-scroll-body"
      >
        <div
          v-show="filtersOpen"
          v-intersect="filterPanelIntersect"
          class="filter-panel pa-2"
        >
          <v-row class="align-center mb-0">
            <v-col class="filter-col d-flex pa-1 align-center ga-1" cols="12" sm="6" md="3">
              <v-select
                v-model="activeCharacterProfileId"
                :items="characterProfileSelectItems"
                label="Character profile"
                density="compact"
                clearable
                hide-details
                class="flex-grow-1"
                @update:model-value="applyCharacterProfile"
              ></v-select>
              <v-btn
                icon
                variant="tonal"
                density="compact"
                aria-label="Edit character profiles"
                @click="openCharactersManager"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </v-col>

            <v-col class="filter-col d-flex pa-1 align-center ga-1" cols="12" sm="6" md="3">
              <v-select
                v-model="activeWeightConfigId"
                :items="weightConfigSelectItems"
                label="Weighted search"
                density="compact"
                clearable
                hide-details
                class="flex-grow-1"
                @update:model-value="onWeightConfigSelected"
              ></v-select>
              <v-btn
                icon
                variant="tonal"
                density="compact"
                aria-label="Edit weight configurations"
                @click="openWeightsManager"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="3">
              <v-text-field
                v-model.number="levelMin"
                type="number"
                min="0"
                :max="LEVEL_MAX"
                step="1"
                label="Level min"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="3">
              <v-text-field
                v-model.number="levelMax"
                type="number"
                min="0"
                :max="LEVEL_MAX"
                step="1"
                label="Level max"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row class="align-center mb-0">
            <v-col class="filter-col d-flex pa-1" cols="6" md="3">
              <v-select
                v-model="charAlignment"
                :items="charAlignments"
                label="Alignment"
                density="compact"
                clearable
                hide-details
                :disabled="characterFiltersLocked"
              ></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="3">
              <v-select
                v-model="charRace"
                :items="charRaces"
                label="Race"
                density="compact"
                clearable
                hide-details
                :disabled="characterFiltersLocked"
              ></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="3">
              <v-select
                v-model="charClass"
                :items="charClasses"
                label="Class"
                density="compact"
                clearable
                hide-details
                :disabled="characterFiltersLocked"
              ></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="3">
              <v-select
                v-model="charGender"
                :items="charGenders"
                label="Gender"
                density="compact"
                clearable
                hide-details
                :disabled="characterFiltersLocked"
              ></v-select>
            </v-col>
          </v-row>

          <v-row class="align-center mb-0">
            <v-col class="filter-col d-flex pa-1" cols="6" md="4">
              <v-select v-model="itemType" :items="itemTypes" label="Item Type" density="compact" clearable hide-details></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="4">
              <v-select v-model="itemClass" :items="itemClasses" label="Item Class" density="compact" clearable hide-details></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="4">
              <v-autocomplete v-model="itemAffect" :items="itemAffects" label="Item Affect" density="compact" clearable hide-details></v-autocomplete>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="4">
              <v-select v-model="itemSlot" :items="itemSlots" label="Wear Location" density="compact" clearable hide-details></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="4">
              <v-select v-model="itemLayer" :items="itemLayers" label="Layer" density="compact" clearable hide-details></v-select>
            </v-col>

            <v-col class="filter-col d-flex pa-1" cols="6" md="4">
              <v-autocomplete
                :model-value="itemPropertyDisplay"
                :items="itemPropertyItems"
                label="Item Property"
                density="compact"
                :clearable="!activeWeightConfig"
                hide-details
                :disabled="!!activeWeightConfig"
                @update:model-value="onItemPropertyUpdate"
              ></v-autocomplete>
            </v-col>
          </v-row>
        </div>

        <v-divider></v-divider>
        <!-- Server mode: sort full filter set, reveal more rows as the pane scrolls. -->
        <v-data-table-server
          :headers="headers"
          :items="visibleCatalog"
          :items-length="sortedCatalog.length"
          :items-per-page="-1"
          hide-default-footer
          v-model:sort-by="sortBy"
          class="catalog-table"
          hover
        >
          <template #item="{ item, index }">
            <tr
              @click="rowClicked(item)"
              :class="['catalog-row', { 'catalog-row--alternate': index % 2 === 0 }]"
            >
              <td
                v-for="header in headers"
                :key="header.key"
                :style="{
                  'text-align': header.align || 'start',
                  ...(header.width ? { width: header.width, maxWidth: header.width, whiteSpace: 'nowrap' } : {}),
                }"
              >
                <template v-if="header.key === 'Weight'">
                  <span v-if="item.Weight">{{ item.Weight.toFixed(2) }} lbs</span>
                </template>
                <template v-else-if="header.key === 'propertyAmount'">
                  <span v-if="item.propertyAmount != null">{{ item.propertyAmount }}</span>
                </template>
                <template v-else-if="header.key === 'weightedScore'">
                  <span v-if="item.weightedScore != null">{{ formatWeightedScore(item.weightedScore) }}</span>
                </template>
                <template v-else-if="header.key === 'damageOrAc'">
                  <span v-if="item.averageDamage">{{ item.averageDamage.toFixed(1) }} Av.D</span>
                  <span v-else-if="item['Armor Class'] != null && item['Armor Class'] !== ''">{{ item['Armor Class'] }} AC</span>
                </template>
                <template v-else-if="header.key === 'Wear Loc.'">
                  <span v-if="item['Wear Loc.']">{{ Array.isArray(item['Wear Loc.']) ? item['Wear Loc.'].join(', ') : item['Wear Loc.'] }}</span>
                </template>
                <template v-else-if="header.key === 'Layer'">
                  <span v-if="item.Layer">{{ Array.isArray(item.Layer) ? item.Layer.join(', ') : item.Layer }}</span>
                </template>
                <template v-else>
                  {{ item[header.key] }}
                </template>
              </td>
            </tr>
          </template>
          <template #bottom>
            <div class="catalog-scroll-status text-caption text-medium-emphasis text-center pa-2">
              <span v-if="sortedCatalog.length">
                Showing {{ visibleCatalog.length }} of {{ sortedCatalog.length }}
              </span>
              <span v-else>No items match</span>
            </div>
            <div
              v-if="visibleCatalog.length < sortedCatalog.length"
              v-intersect="catalogScrollIntersect"
              class="catalog-scroll-sentinel"
              aria-hidden="true"
            ></div>
          </template>
        </v-data-table-server>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'

/** keep-alive include name in App.vue — preserves filters/sort across item nav. */
defineOptions({ name: 'CatalogView' })

/** Scroll root for filters + infinite-load table body. */
const catalogScrollBody = ref<HTMLElement | null>(null)
import {
  catalogQueryToState,
  catalogStateToQuery,
  sameCatalogQuery,
} from '../composables/useCatalogQuery'
import { getItemPropertyAmount } from '../itemProperties'
import { LEVEL_MAX } from '../presets/constants'
import { usePresets } from '../presets/usePresets'
import { formatWeightedScore, getWeightedScore } from '../presets/weightedScore'
import { useCatalogStore } from '../store'

const store = useCatalogStore()
const route = useRoute()
const router = useRouter()
const { mdAndUp } = useDisplay()

/** Filters start collapsed; toolbar toggle + auto-collapse when scrolled away. */
const filtersOpen = ref(false)

/** Collapse filters once the panel leaves the catalog scroll pane (same as toggle off). */
const onFilterPanelIntersect = (isIntersecting: boolean) => {
  if (!isIntersecting && filtersOpen.value) {
    filtersOpen.value = false
  }
}

const filterPanelIntersect = computed(() => ({
  handler: onFilterPanelIntersect,
  options: {
    root: catalogScrollBody.value,
    threshold: 0,
    rootMargin: '0px',
  },
}))

watch(filtersOpen, (open) => {
  if (open) {
    // Bring the panel into view under the sticky toolbar.
    catalogScrollBody.value?.scrollTo({ top: 0 })
  }
})

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

/** Softcap stats from the active profile; no profile → defaults (15) in scoring. */
const activeCharacterStats = computed(() => activeCharacterProfile.value?.stats ?? null)

const searchText = ref('')
const levelRange = ref<[number, number]>([0, 90])

const clampLevel = (n: unknown, fallback: number) => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(LEVEL_MAX, Math.max(0, Math.round(v)))
}

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

/** Character profile locks level + align/race/class/gender until cleared. */
const characterFiltersLocked = computed(() => !!activeCharacterProfileId.value)

const itemTypes = computed(() => store.itemTypes ?? [])
const itemClasses = computed(() => store.itemClasses ?? [])
const itemAffects = computed(() => store.itemAffects ?? [])
const itemProperties = computed(() => store.itemProperties ?? [])

/** Item Property shows literal "weighted" while a weight config is active. */
const itemPropertyDisplay = computed(() =>
  activeWeightConfig.value ? 'weighted' : itemProperty.value,
)
const itemPropertyItems = computed(() =>
  activeWeightConfig.value ? ['weighted'] : itemProperties.value,
)

const onItemPropertyUpdate = (value: string | null) => {
  if (activeWeightConfig.value) {
    return
  }
  itemProperty.value = value
}

const applyingRoute = ref(false)

const queryHas = (key: string) =>
  Object.prototype.hasOwnProperty.call(route.query, key)

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

  // Weights: URL wins only when it explicitly picks weights / w / property.
  // Otherwise keep sticky localStorage selection across reloads.
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

  // Character: URL wins for character=/stats; else re-apply sticky profile fields.
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

  sortByScoreOrPropertyDesc()
  queueMicrotask(() => {
    applyingRoute.value = false
    // Seed sticky actives back into the address bar when the URL omitted them.
    pushFilterQuery()
  })
}

const currentFilterState = () => ({
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
  // Expand unsaved presets into w=/stats so a refresh keeps them (no saved ids).
  const query = catalogStateToQuery(currentFilterState(), {
    activeProfile: activeCharacterProfile.value,
    activeWeights: activeWeightConfig.value,
  })
  if (sameCatalogQuery(query, route.query)) return
  router.replace({ name: 'catalog', query })
}

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

watch(
  () => route.query,
  () => {
    if (route.name !== 'catalog') return
    const query = catalogStateToQuery(currentFilterState())
    if (sameCatalogQuery(query, route.query)) return
    applyQueryToState()
  },
)

const headers = computed(() => {
  const cols: { title: string; key: string; align: 'start' | 'end'; width?: string }[] = [
    { title: 'Level', key: 'Level', align: 'end', width: '4.5rem' },
    { title: 'Item', key: 'name', align: 'start' },
  ]

  if (mdAndUp.value) {
    cols.push(
      { title: 'Wear Loc.', key: 'Wear Loc.', align: 'start' },
      { title: 'Layer', key: 'Layer', align: 'start' },
    )
  }

  const weightedActive = !!activeWeightConfig.value
  if (weightedActive) {
    cols.push({
      title: activeWeightConfig.value?.name
        ? `Score (${activeWeightConfig.value.name})`
        : 'Score',
      key: 'weightedScore',
      align: 'end',
    })
  } else if (itemProperty.value) {
    cols.push({
      title: String(itemProperty.value),
      key: 'propertyAmount',
      align: 'end',
    })
  } else if (mdAndUp.value) {
    cols.push({ title: 'Weight', key: 'Weight', align: 'end' })
  }

  if (mdAndUp.value || (!itemProperty.value && !weightedActive)) {
    let damageOrAcTitle = ''
    if (itemType.value === 'armor') {
      damageOrAcTitle = 'Armor Class'
    } else if (itemType.value === 'weapon') {
      damageOrAcTitle = 'Av. Damage'
    }
    cols.push({ title: damageOrAcTitle, key: 'damageOrAc', align: 'end' })
  }
  return cols
})

const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([
  { key: 'datetime', order: 'desc' },
])

/** Rows revealed per scroll chunk (replaces paginated pages). */
const CATALOG_PAGE_SIZE = 40
const visibleCount = ref(CATALOG_PAGE_SIZE)

const sortByScoreOrPropertyDesc = () => {
  if (activeWeightConfig.value) {
    sortBy.value = [{ key: 'weightedScore', order: 'desc' }]
  } else if (itemProperty.value) {
    sortBy.value = [{ key: 'propertyAmount', order: 'desc' }]
  }
}

watch([activeWeightConfigId, itemProperty], () => {
  sortByScoreOrPropertyDesc()
})

const itemSlots = ref([
  'arms', 'body', 'feet', 'finger', 'hands', 'head', 'left_hand', 'legs',
  'float_nearby', 'neck', 'right_hand', 'waist', 'wrist',
])

const itemLayers = ref(['bottom', 'under', 'base', 'over', 'top'])

const charClasses = [
  'Bard', 'Bulwark', 'Cleric', 'Druid', 'Harbinger', 'Legate', 'Mage', 'Monk',
  'Paladin', 'Ranger', 'Reaver', 'Thief', 'Warrior',
].sort()

const charRaces = [
  'Ogre', 'Troll', 'Orc', 'Vyan', 'Goblin', 'Human', 'Lizardfolk', 'Dwarf',
  'Halfling', 'Gnome', 'Ent', 'Elf',
].sort()

const charAlignments = [
  'Lawful Good', 'Lawful Neutral', 'Lawful Evil', 'Neutral Good', 'True Neutral',
  'Neutral Evil', 'Chaotic Good', 'Chaotic Neutral', 'Chaotic Evil',
].sort()

const charGenders = ['Female', 'Male'].sort()

const catalog = computed<any[]>(() => {
  const catalog = store.catalog
  if (!catalog) return []

  const filtered = catalog.filter((item: any) => {
    if (searchText.value) {
      const q = searchText.value.toLowerCase()
      if (
        item['Unidentified Name'].toLowerCase().indexOf(q) === -1 &&
        item.buffer.toLowerCase().indexOf(q) === -1 &&
        item.name.toLowerCase().indexOf(q) === -1
      ) {
        return false
      }
    }
    if (itemType.value && item.itemType !== itemType.value) return false
    if (itemClass.value && (!item.Class || item.Class !== itemClass.value)) return false
    if (itemAffect.value) {
      if (!item.affects || !item.affects.find((aff: any) => aff.name === itemAffect.value)) {
        return false
      }
    }
    if (!activeWeightConfig.value && itemProperty.value) {
      if (getItemPropertyAmount(item, itemProperty.value, activeCharacterStats.value) === null) {
        return false
      }
    }
    if (itemSlot.value) {
      if (!item['Wear Loc.'] || item['Wear Loc.'].indexOf(itemSlot.value) < 0) return false
    }
    if (itemLayer.value) {
      if (!item.Layer || item.Layer.indexOf(itemLayer.value) < 0) return false
    }
    if (charAlignment.value && !item.charAlignments[charAlignment.value]) return false
    if (charRace.value && !item.charRaces[charRace.value.toLowerCase()]) return false
    if (charClass.value && !item.charClasses[charClass.value.toLowerCase()]) return false
    if (charGender.value && !item.charGenders[charGender.value.toLowerCase()]) return false
    if (item.Level < levelRange.value[0] || item.Level > levelRange.value[1]) return false
    return true
  })

  const weights = activeWeightConfig.value?.weights ?? null
  const stats = activeCharacterStats.value
  return filtered.map((item: any) => ({
    ...item,
    propertyAmount:
      !weights && itemProperty.value
        ? getItemPropertyAmount(item, itemProperty.value, stats)
        : null,
    weightedScore: weights ? getWeightedScore(item, weights, stats) : null,
    damageOrAc: item.averageDamage ?? item['Armor Class'] ?? null,
  }))
})

const sortValue = (item: any, key: string): string | number | null => {
  const raw = item?.[key]
  if (raw == null || raw === '') return null
  if (Array.isArray(raw)) return raw.join(', ')
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const asNum = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(asNum) && key !== 'name') return asNum
    return raw.toLowerCase()
  }
  return String(raw)
}

/** Full filtered set in current header sort order (server-table owns the slice). */
const sortedCatalog = computed(() => {
  const items = catalog.value.slice()
  const spec = sortBy.value[0]
  if (!spec?.key) return items
  const dir = spec.order === 'desc' ? -1 : 1
  items.sort((a, b) => {
    const av = sortValue(a, spec.key)
    const bv = sortValue(b, spec.key)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * dir
  })
  return items
})

const visibleCatalog = computed(() => sortedCatalog.value.slice(0, visibleCount.value))

const resetVisibleCatalog = () => {
  visibleCount.value = CATALOG_PAGE_SIZE
}

watch(sortBy, resetVisibleCatalog, { deep: true })
watch(catalog, resetVisibleCatalog)

const loadMoreCatalog = () => {
  if (visibleCount.value >= sortedCatalog.value.length) return
  visibleCount.value = Math.min(
    visibleCount.value + CATALOG_PAGE_SIZE,
    sortedCatalog.value.length,
  )
}

/** v-intersect: reveal the next chunk when the sentinel enters the scroll pane. */
const onCatalogScrollSentinel = (isIntersecting: boolean) => {
  if (isIntersecting) loadMoreCatalog()
}

const catalogScrollIntersect = computed(() => ({
  handler: onCatalogScrollSentinel,
  options: {
    root: catalogScrollBody.value,
    threshold: 0,
    rootMargin: '120px 0px',
  },
}))

/** Clear weighted search and fields it owns (item property). */
const clearWeightSelection = () => {
  activeWeightConfigId.value = null
  clearUnsavedWeightConfig()
  itemProperty.value = null
  sortByScoreOrPropertyDesc()
}

const onWeightConfigSelected = (id: string | null) => {
  if (id) {
    itemProperty.value = null
    sortByScoreOrPropertyDesc()
    return
  }
  clearWeightSelection()
}

const applyCharacterProfile = (id: string | null) => {
  // Clearing resets every field the profile was driving.
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
  // Keep min as-is (default 0); only pre-set max to the character's level.
  const min = levelRange.value[0]
  levelRange.value = [min, Math.max(min, profile.level)]
  charAlignment.value = profile.alignment
  charRace.value = profile.race
  charClass.value = profile.class
  charGender.value = profile.gender
}

type FilterChip = { id: string; label: string; clear: () => void }

/** Active filters as clearable chips; skip fields locked by profile/weights. */
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

  // Level stays editable with a profile — still chip when not default.
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

  // Profile locks align/race/class/gender — skip those chips while selected.
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

  // Class chip replaces type when class is set.
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

  // Weights disable the property filter — skip that chip while weighted.
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

const rowClicked = (item: any) => {
  router.push({
    name: 'item',
    params: { itemKey: item.catalogKey ?? item.name },
    query: route.query,
  })
}

const CATALOG_QUERY_KEYS = new Set([
  'q', 'level', 'align', 'race', 'class', 'gender', 'type', 'itemClass',
  'affect', 'slot', 'layer', 'property', 'weights', 'character', 'w',
  'str', 'int', 'wis', 'dex', 'con',
])

const routeHasCatalogQuery = () =>
  Object.keys(route.query).some((k) => CATALOG_QUERY_KEYS.has(k))

onMounted(() => {
  if (routeHasCatalogQuery()) {
    // Shared / refreshed URL wins over localStorage actives.
    applyQueryToState()
  } else {
    // Seed the address bar from current UI + localStorage preset selection.
    pushFilterQuery()
  }
  // Pinia keeps the catalog; only fetch once (keep-alive also skips remount).
  if (!store.catalog) store.fetchCatalog()
  sortByScoreOrPropertyDesc()
})
</script>

<style scoped>
.content-shell {
  max-width: 1280px;
}

/* Fill under sticky nav; brand above scrolls away independently. */
.catalog-shell {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: calc(100dvh - var(--tfecat-nav-height, 57px));
  max-height: calc(100dvh - var(--tfecat-nav-height, 57px));
}

.catalog-card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));
}

.catalog-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  flex-wrap: wrap;
  background: rgb(var(--v-theme-surface));
}

.catalog-scroll-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.filter-panel {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

.search-field {
  max-width: 360px;
  flex: 0 1 360px;
}

.catalog-table :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 52px;
  border-bottom-color: rgb(var(--v-theme-surface-variant)) !important;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.catalog-row {
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  transition: background-color 120ms ease;
}

.catalog-row--alternate {
  background: rgb(var(--v-theme-background));
}

.catalog-row:hover {
  background: rgba(var(--v-theme-primary), 0.09) !important;
}

.catalog-row td {
  height: 56px !important;
  border-bottom-color: rgb(var(--v-theme-surface-variant)) !important;
  color: rgb(var(--v-theme-on-surface));
}

.catalog-scroll-status {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
}

.catalog-scroll-sentinel {
  height: 1px;
  width: 100%;
  pointer-events: none;
}

.v-icon {
  color: inherit;
}
.v-btn .v-icon {
  color: inherit;
}
.v-text-field .v-icon {
  color: rgba(255, 255, 255, 0.7) !important;
}

@media (max-width: 599px) {
  .search-field {
    max-width: none;
  }
}

@media (max-width: 449px) {
  .filter-col {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
}
</style>
