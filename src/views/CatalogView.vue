<template>
  <!-- Document scroll only; sticky chrome is App main nav. Search lives above the table. -->
  <v-container fluid class="content-shell px-6 px-sm-8 pt-4 pb-10">
    <v-card class="catalog-card" elevation="0">
      <div class="catalog-toolbar pa-3 ga-2">
        <v-btn
          icon
          variant="tonal"
          density="comfortable"
          :color="filtersPageActive ? 'primary' : undefined"
          :aria-pressed="filtersPageActive"
          aria-label="Toggle filters"
          @click="toggleFiltersPage"
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
      </div>

      <div class="catalog-meta px-3 pb-3">
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
        <div class="catalog-count text-caption text-medium-emphasis">
          <span v-if="sortedCatalog.length">
            {{ sortedCatalog.length }} {{ sortedCatalog.length === 1 ? 'item' : 'items' }}
          </span>
          <span v-else>No items match</span>
        </div>
      </div>

      <v-divider></v-divider>

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
        <template #headers="{ columns, isSorted, getSortIcon, toggleSort }">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                'catalog-th',
                column.sortable !== false ? 'catalog-th--sortable' : '',
              ]"
              :style="{
                textAlign: column.align || 'start',
                ...(column.width
                  ? { width: column.width, maxWidth: column.width, whiteSpace: 'nowrap' }
                  : {}),
              }"
              scope="col"
              @click="column.sortable !== false && toggleSort(column)"
            >
              <span class="catalog-th__label">{{ column.title }}</span>
              <v-icon
                v-if="column.sortable !== false && isSorted(column)"
                class="catalog-th__sort"
                size="x-small"
              >
                {{ getSortIcon(column) }}
              </v-icon>
            </th>
          </tr>
        </template>

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
              <template v-else-if="header.key === 'wearLayer'">
                <span v-if="item.wearLayer">{{ item.wearLayer }}</span>
              </template>
              <template v-else>
                {{ item[header.key] }}
              </template>
            </td>
          </tr>
        </template>

        <template #bottom>
          <div
            v-if="visibleCatalog.length < sortedCatalog.length"
            v-intersect="onCatalogScrollSentinel"
            class="catalog-scroll-sentinel"
            aria-hidden="true"
          ></div>
        </template>
      </v-data-table-server>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useCatalogFilters } from '../composables/useCatalogFilters'
import { getItemPropertyAmount } from '../itemProperties'
import { formatWeightedScore, getWeightedScore } from '../presets/weightedScore'
import { useCatalogStore } from '../store'

/** keep-alive include name in App.vue — preserves filters/sort across item nav. */
defineOptions({ name: 'CatalogView' })

const store = useCatalogStore()
const route = useRoute()
const router = useRouter()
const { mdAndUp } = useDisplay()

const {
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
  activeFilterChips,
  activeWeightConfigId,
  activeWeightConfig,
  activeCharacterProfile,
  filtersPageActive,
  ensureFilterSync,
  toggleFiltersPage,
} = useCatalogFilters()

/** Softcap stats from the active profile; no profile → defaults (15) in scoring. */
const activeCharacterStats = computed(() => activeCharacterProfile.value?.stats ?? null)

/** Chip-style wear+layer label: `head.top`, or just one part when alone. */
const formatWearLayer = (item: any): string => {
  const list = (value: unknown): string => {
    if (value == null || value === '') return ''
    if (Array.isArray(value)) return value.filter(Boolean).join(', ')
    return String(value)
  }
  const parts = [list(item?.['Wear Loc.']), list(item?.Layer)].filter(Boolean)
  return parts.join('.')
}

const headers = computed(() => {
  const cols: {
    title: string
    key: string
    align: 'start' | 'end'
    width?: string
    sortable?: boolean
  }[] = [
    { title: 'Level', key: 'Level', align: 'end', width: '4.5rem' },
    { title: 'Item', key: 'name', align: 'start' },
  ]

  if (mdAndUp.value) {
    cols.push({ title: 'Wear', key: 'wearLayer', align: 'start' })
  }

  const weightedActive = !!activeWeightConfig.value
  if (weightedActive) {
    // Long "Score (Fighter)" header only on md+; smaller breakpoints stay compact.
    cols.push({
      title:
        mdAndUp.value && activeWeightConfig.value?.name
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
    wearLayer: formatWearLayer(item) || null,
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

/** Window IntersectionObserver: reveal the next chunk near the bottom of the page. */
const onCatalogScrollSentinel = (isIntersecting: boolean) => {
  if (isIntersecting) loadMoreCatalog()
}

const rowClicked = (item: any) => {
  router.push({
    name: 'item',
    params: { itemKey: item.catalogKey ?? item.name },
    query: route.query,
  })
}

onMounted(() => {
  ensureFilterSync()
  if (!store.catalog) store.fetchCatalog()
  sortByScoreOrPropertyDesc()
})
</script>

<style scoped>
.content-shell {
  max-width: 1280px;
}

.catalog-card {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));
}

.catalog-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  background: rgb(var(--v-theme-surface));
}

.search-field {
  max-width: 360px;
  flex: 1 1 220px;
}

/* Chips + count scroll away with the page (not sticky). */
.catalog-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
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

.catalog-count {
  flex: 0 0 auto;
  margin-left: auto;
  white-space: nowrap;
}

.catalog-table :deep(thead) {
  background: rgb(var(--v-theme-surface-variant));
}

.catalog-th {
  height: 52px;
  padding: 0 16px;
  border-bottom: thin solid rgb(var(--v-theme-surface-variant)) !important;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  user-select: none;
  white-space: nowrap;
}

.catalog-th--sortable {
  cursor: pointer;
}

.catalog-th__label {
  vertical-align: middle;
}

.catalog-th__sort {
  margin-left: 4px;
  vertical-align: middle;
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

.catalog-scroll-sentinel {
  height: 1px;
  width: 100%;
  pointer-events: none;
}

@media (max-width: 599px) {
  .search-field {
    max-width: none;
  }
}
</style>
