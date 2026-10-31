<template>
  <v-container fluid class="pa-2">
    <v-btn
      class="mb-2"
      variant="tonal"
      density="compact"
      prepend-icon="mdi-arrow-left"
      @click="goBack"
    >
      Back to search
    </v-btn>

    <v-card v-if="item" class="modal-card">
      <v-card-title class="d-flex justify-space-between align-center pb-1 modal-title">
        <span style="text-transform: capitalize; font-size: 1.2rem; font-weight: 500;">{{ item.name }}</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="mt-2 modal-content pa-4">
        <pre class="item-ident-pre">{{ displayBuffer }}</pre>
        <div v-if="item.custom && Object.keys(item.custom).length > 0" class="mt-4">
          <div v-for="(custom, roomKey) in item.custom" :key="roomKey" class="mb-3">
            <div class="text-subtitle-1 mb-1" style="color: #888;">Custom in Room #{{ roomKey }}:</div>
            <pre style="margin: 0; color: #e0e0e0; font-size: 0.9rem; white-space: pre; overflow-x: auto; background: #2a2a2a; padding: 8px; border-radius: 4px;">Item                        Price  Weight  Lvl  Ingredients
----                        -----  ------  ---  -----------
{{ custom.raw }}</pre>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-else-if="catalogLoaded" type="warning" variant="tonal" class="mt-2">
      Item not found.
      <template #append>
        <v-btn variant="text" @click="goBack">Back</v-btn>
      </template>
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCatalogStore } from '../store'

const props = defineProps<{ itemKey: string }>()

const store = useCatalogStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  if (!store.catalog) {
    store.fetchCatalog()
  }
})

const catalogLoaded = computed(() => !!store.catalog)

const item = computed(() => {
  // vue-router provides decoded params; tolerate a once-encoded key too.
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

/** Allowed values for a restriction map; null if unrestricted (all true). */
const allowedRestrictionValues = (map: Record<string, boolean> | undefined): string[] | null => {
  if (!map) {
    return null
  }
  const entries = Object.entries(map)
  if (!entries.length) {
    return null
  }
  const allowed = entries.filter(([, ok]) => ok).map(([k]) => k)
  if (allowed.length === entries.length) {
    return null
  }
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

const goBack = () => {
  router.push({ name: 'catalog', query: route.query })
}
</script>

<style scoped>
.item-ident-pre {
  margin: 0;
  color: #e0e0e0;
  font-size: 0.875rem;
  white-space: pre;
  overflow-x: auto;
}
</style>
