<template>
  <v-container fluid class="content-shell px-6 px-sm-8 pt-4 pb-10">
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <nav class="text-body-2 crumb-nav" aria-label="Breadcrumb">
        <router-link :to="{ name: 'catalog', query: route.query }" class="crumb-link">
          Item Search
        </router-link>
        <span class="mx-1 text-medium-emphasis">›</span>
        <span class="text-high-emphasis" style="text-transform: capitalize;">
          {{ item?.name || 'Item' }}
        </span>
        <v-btn
          icon
          variant="text"
          density="compact"
          size="small"
          class="share-crumb-btn"
          :aria-label="shareCopied ? 'Copied' : 'Share'"
          @click="onShare"
        >
          <v-icon size="small">{{ shareCopied ? 'mdi-check' : 'mdi-share-variant' }}</v-icon>
        </v-btn>
      </nav>
    </div>

    <template v-if="item">
      <!-- Ident, weight summary, and customs share one pre so they scroll together. -->
      <pre class="item-ident-pre">{{ displayBuffer }}</pre>
    </template>

    <v-alert v-else-if="catalogLoaded" type="warning" variant="tonal" class="mt-2">
      Item not found.
      <template #append>
        <v-btn variant="text" :to="{ name: 'catalog', query: route.query }">Back</v-btn>
      </template>
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { catalogQueryToState } from '../composables/useCatalogQuery'
import { copyShareLink, useShareFeedback } from '../composables/useShareLink'
import { usePresets } from '../presets/usePresets'
import { formatWeightSummary } from '../presets/weightedScore'
import { useCatalogStore } from '../store'

const props = defineProps<{ itemKey: string }>()

const store = useCatalogStore()
const router = useRouter()
const route = useRoute()
const { activeCharacterProfile, activeWeightConfig } = usePresets()
const { shareCopied, flashCopied } = useShareFeedback()

onMounted(() => {
  if (!store.catalog) store.fetchCatalog()
})

const catalogLoaded = computed(() => !!store.catalog)

const item = computed(() => {
  const raw = props.itemKey
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  return (
    store.catalog?.find((i: any) => i.catalogKey === raw || i.catalogKey === decoded) ?? null
  )
})

const allowedRestrictionValues = (map: Record<string, boolean> | undefined): string[] | null => {
  if (!map) return null
  const entries = Object.entries(map)
  if (!entries.length) return null
  const allowed = entries.filter(([, ok]) => ok).map(([k]) => k)
  if (allowed.length === entries.length) return null
  return allowed
}

const IDENT_COLON_COLUMN = 14
const formatRequirementLine = (label: string, values: string[]): string =>
  `${label.padStart(IDENT_COLON_COLUMN)}: ${values.join(', ')}`

const ALIGNMENT_CODES: Record<string, string> = {
  'Lawful Good': 'LG',
  'Lawful Neutral': 'LN',
  'Lawful Evil': 'LE',
  'Neutral Good': 'NG',
  'True Neutral': 'PN',
  'Neutral Evil': 'NE',
  'Chaotic Good': 'CG',
  'Chaotic Neutral': 'CN',
  'Chaotic Evil': 'CE',
}

const buildRequiresBlock = (it: any): string | null => {
  const lines: string[] = []
  const gender = allowedRestrictionValues(it.charGenders)
  if (gender) lines.push(formatRequirementLine('Gender', gender))
  const race = allowedRestrictionValues(it.charRaces)
  if (race) lines.push(formatRequirementLine('Race', race))
  const klass = allowedRestrictionValues(it.charClasses)
  if (klass) lines.push(formatRequirementLine('Class', klass))
  const alignment = allowedRestrictionValues(it.charAlignments)
  if (alignment) {
    lines.push(formatRequirementLine(
      'Alignment',
      alignment.map((name) => ALIGNMENT_CODES[name] ?? name),
    ))
  }
  return lines.length ? lines.join('\n') : null
}

const formatItemDisplayBuffer = (it: any): string => {
  const buffer: string = it?.buffer ?? ''
  const requires = buildRequiresBlock(it)
  const antiFlagsLine = /^[ \t]*Anti-Flags:.*$/m
  if (!requires) return buffer
  if (antiFlagsLine.test(buffer)) return buffer.replace(antiFlagsLine, requires)
  if (/^[ \t]*Restrictions:.*$/m.test(buffer)) {
    return buffer.replace(/^[ \t]*Restrictions:.*$/m, (line) => `${requires}\n\n${line}`)
  }
  return `${buffer.replace(/\s*$/, '')}\n\n${requires}\n`
}

/** CLI-style per-property × weight breakdown when a weight config is active. */
const weightSummary = computed(() => {
  const it = item.value
  const weights = activeWeightConfig.value?.weights
  if (!it || !weights || !Object.keys(weights).length) return ''
  return formatWeightSummary(it, weights, activeCharacterProfile.value?.stats ?? null)
})

const CUSTOM_TABLE_HEADER = `Item                        Price  Weight  Lvl  Ingredients
----                        -----  ------  ---  -----------`

/** Append custom-in-room blocks in the same monospace layout as before. */
const formatCustomsBlock = (it: any): string => {
  const custom = it?.custom
  if (!custom || typeof custom !== 'object') return ''
  const rooms = Object.keys(custom)
  if (!rooms.length) return ''
  return rooms
    .map((roomKey) => {
      const raw = custom[roomKey]?.raw ?? ''
      return `Custom in Room #${roomKey}:\n${CUSTOM_TABLE_HEADER}\n${raw}`.replace(/\s*$/, '')
    })
    .join('\n\n')
}

/** Single pre: ident, optional weight block, optional customs. */
const displayBuffer = computed(() => {
  if (!item.value) return ''
  const parts = [
    formatItemDisplayBuffer(item.value).replace(/\s*$/, ''),
    weightSummary.value,
    formatCustomsBlock(item.value),
  ].filter(Boolean)
  return `${parts.join('\n\n')}\n`
})

const onShare = async () => {
  const parsed = catalogQueryToState(route.query)
  const ok = await copyShareLink({
    router,
    route,
    filterState: {
      searchText: parsed.searchText ?? '',
      levelRange: parsed.levelRange ?? [0, 90],
      charAlignment: parsed.charAlignment ?? null,
      charClass: parsed.charClass ?? null,
      charRace: parsed.charRace ?? null,
      charGender: parsed.charGender ?? null,
      itemType: parsed.itemType ?? null,
      itemClass: parsed.itemClass ?? null,
      itemAffect: parsed.itemAffect ?? null,
      itemProperty: parsed.itemProperty ?? null,
      itemSlot: parsed.itemSlot ?? null,
      itemLayer: parsed.itemLayer ?? null,
      activeWeightConfigId: parsed.activeWeightConfigId ?? null,
      activeCharacterProfileId: parsed.activeCharacterProfileId ?? null,
    },
    activeProfile: activeCharacterProfile.value,
    activeWeights: activeWeightConfig.value,
  })
  if (ok) flashCopied()
}
</script>

<style scoped>
.content-shell { max-width: 1280px; }

.crumb-nav {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.crumb-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.crumb-link:hover {
  text-decoration: underline;
}

.share-crumb-btn {
  margin-left: 4px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
}
.share-crumb-btn:hover {
  opacity: 1;
}

.item-ident-pre {
  margin: 0;
  color: inherit;
  font-size: 0.875rem;
  white-space: pre;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
