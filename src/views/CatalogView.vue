<template>
  <v-container fluid class="content-shell px-6 px-sm-8 py-10">
        <v-expansion-panels class="filter-panel">
          <v-expansion-panel>
            <v-expansion-panel-title>Filter Items</v-expansion-panel-title>
            <v-expansion-panel-text class="pa-1">
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
                    :disabled="characterFiltersLocked"
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
                    :disabled="characterFiltersLocked"
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
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-card class="catalog-card mt-4" elevation="0">
          <v-card-title class="catalog-toolbar pa-3 ga-2">
            <v-btn
              variant="tonal"
              density="compact"
              :prepend-icon="shareCopied ? 'mdi-check' : 'mdi-share-variant'"
              @click="onShare"
            >
              {{ shareCopied ? 'Copied' : 'Share' }}
            </v-btn>
            <v-spacer></v-spacer>
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
          <v-divider></v-divider>
          <v-data-table
            :headers="headers"
            :items="catalog"
            :items-per-page-options="itemsPerPageOptions"
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
          </v-data-table>
        </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import {
  catalogQueryToState,
  catalogStateToQuery,
  sameCatalogQuery,
} from '../composables/useCatalogQuery'
import { copyShareLink, useShareFeedback } from '../composables/useShareLink'
import { getItemPropertyAmount } from '../itemProperties'
import { LEVEL_MAX } from '../presets/constants'
import { usePresets } from '../presets/usePresets'
import { formatWeightedScore, getWeightedScore } from '../presets/weightedScore'
import { useCatalogStore } from '../store'

const store = useCatalogStore()
const route = useRoute()
const router = useRouter()
const { mdAndUp } = useDisplay()
const { shareCopied, flashCopied } = useShareFeedback()

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
  itemProperty.value = partial.itemProperty ?? null
  itemSlot.value = partial.itemSlot ?? null
  itemLayer.value = partial.itemLayer ?? null

  if (partial.sharedWeights) {
    setUnsavedWeightConfig(partial.sharedWeights)
    itemProperty.value = null
  } else {
    activeWeightConfigId.value = partial.activeWeightConfigId ?? null
    if (activeWeightConfigId.value) {
      itemProperty.value = null
    }
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
  } else {
    activeCharacterProfileId.value = partial.activeCharacterProfileId ?? null
    if (activeCharacterProfileId.value) {
      applyCharacterProfile(activeCharacterProfileId.value)
    }
  }

  sortByScoreOrPropertyDesc()
  queueMicrotask(() => {
    applyingRoute.value = false
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

const onShare = async () => {
  const ok = await copyShareLink({
    router,
    route,
    filterState: currentFilterState(),
    activeProfile: activeCharacterProfile.value,
    activeWeights: activeWeightConfig.value,
  })
  if (ok) flashCopied()
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

const itemsPerPageOptions = [5, 10, 15, 20, 25, 30, -1]

const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([
  { key: 'datetime', order: 'desc' },
])

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

const onWeightConfigSelected = (id: string | null) => {
  if (id) itemProperty.value = null
  sortByScoreOrPropertyDesc()
}

const applyCharacterProfile = (id: string | null) => {
  // Clearing unlocks the fields but leaves current filter values in place.
  if (!id) return
  const profile = characterProfiles.value.find((p) => p.id === id)
  if (!profile) return
  levelRange.value = [1, profile.level]
  charAlignment.value = profile.alignment
  charRace.value = profile.race
  charClass.value = profile.class
  charGender.value = profile.gender
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
  store.fetchCatalog()
  sortByScoreOrPropertyDesc()
})
</script>

<style scoped>
.content-shell {
  max-width: 1280px;
}

.filter-panel :deep(.v-expansion-panel) {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
  box-shadow: none;
}

.filter-panel :deep(.v-expansion-panel-title) {
  min-height: 52px;
  font-weight: 500;
}

.catalog-card {
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));
}

.catalog-toolbar {
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-surface));
}

.search-field {
  max-width: 360px;
}

.catalog-table :deep(thead th) {
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

.catalog-table :deep(.v-data-table-footer) {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-secondary));
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
