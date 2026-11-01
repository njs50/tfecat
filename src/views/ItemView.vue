<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <nav class="text-body-2" aria-label="Breadcrumb">
        <router-link :to="{ name: 'catalog', query: route.query }" class="crumb-link">
          Item Search
        </router-link>
        <span class="mx-1 text-medium-emphasis">›</span>
        <span class="text-high-emphasis" style="text-transform: capitalize;">
          {{ item?.name || 'Item' }}
        </span>
      </nav>
      <v-spacer></v-spacer>
      <v-btn
        variant="tonal"
        density="compact"
        :prepend-icon="shareCopied ? 'mdi-check' : 'mdi-share-variant'"
        @click="onShare"
      >
        {{ shareCopied ? 'Copied' : 'Share' }}
      </v-btn>
    </div>

    <template v-if="item">
      <pre class="item-ident-pre">{{ displayBuffer }}</pre>
      <div v-if="item.custom && Object.keys(item.custom).length > 0" class="mt-4">
        <div v-for="(custom, roomKey) in item.custom" :key="roomKey" class="mb-3">
          <div class="text-subtitle-1 mb-1 text-medium-emphasis">Custom in Room #{{ roomKey }}:</div>
          <pre class="item-ident-pre">Item                        Price  Weight  Lvl  Ingredients
----                        -----  ------  ---  -----------
{{ custom.raw }}</pre>
        </div>
      </div>
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

const displayBuffer = computed(() => (item.value ? formatItemDisplayBuffer(item.value) : ''))

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
.crumb-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.crumb-link:hover {
  text-decoration: underline;
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
