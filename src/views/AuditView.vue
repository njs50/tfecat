<template>
  <v-container fluid class="content-shell px-4 px-sm-6 px-md-8 pt-4 pb-10">
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <nav class="text-body-2" aria-label="Breadcrumb">
        <span>Item audit</span>
      </nav>
      <v-spacer></v-spacer>
      <v-btn
        :to="{ name: 'filters', query: route.query }"
        variant="text"
        size="small"
        prepend-icon="mdi-filter-variant"
      >
        Filters
      </v-btn>
      <v-btn
        :to="{
          name: 'characters',
          params: { id: activeCharacterProfileId || undefined },
          query: route.query,
        }"
        variant="text"
        size="small"
        prepend-icon="mdi-account"
      >
        Character
      </v-btn>
    </div>

    <h1 class="text-h6 mb-1">Item audit</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Paste a Mudlet <code>equipment</code> list, then find upgrades using the same filters and
      weights as the item catalog.
    </p>

    <v-row dense class="mb-2">
      <v-col cols="12" md="6">
        <v-select
          :model-value="activeCharacterProfileId"
          :items="characterProfileSelectItems"
          label="Character profile"
          density="compact"
          clearable
          hide-details
          @update:model-value="onProfileChange"
        ></v-select>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          :model-value="activeWeightConfigId"
          :items="weightConfigSelectItems"
          label="Weight config"
          density="compact"
          clearable
          hide-details
          @update:model-value="(v) => (activeWeightConfigId = v)"
        ></v-select>
      </v-col>
    </v-row>

    <v-textarea
      v-model="pasteText"
      label="Equipment paste"
      auto-grow
      rows="8"
      max-rows="20"
      density="compact"
      hide-details="auto"
      spellcheck="false"
      class="mono-field mb-3"
      :placeholder="placeholder"
    ></v-textarea>

    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <v-btn color="primary" variant="elevated" :disabled="!canRun" @click="runAudit">
        Run audit
      </v-btn>
      <v-btn
        variant="tonal"
        :disabled="!activeCharacterProfileId || !pasteText.trim()"
        @click="savePasteToProfile"
      >
        Save paste to profile
      </v-btn>
      <v-checkbox
        v-model="verbose"
        label="Show empty slots"
        density="compact"
        hide-details
        class="ml-sm-2"
      ></v-checkbox>
      <v-checkbox
        v-model="sidegrades"
        label="Include sidegrades"
        density="compact"
        hide-details
      ></v-checkbox>
    </div>

    <v-alert
      v-if="scoringMode === 'none' && attempted"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Select a weight config (or an Item Property on the filters page) so upgrades can be ranked.
    </v-alert>

    <v-alert
      v-if="parseErrors.length"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <div class="text-subtitle-2 mb-1">Parse notes</div>
      <ul class="mb-0 pl-4">
        <li v-for="(err, i) in parseErrors" :key="i">{{ err }}</li>
      </ul>
    </v-alert>

    <template v-if="report">
      <p v-if="report.gearTotal != null" class="text-body-2 mb-3">
        Total equipped {{ report.propertyLabel }}:
        <strong>{{ formatScore(report.gearTotal) }}</strong>
      </p>

      <v-alert
        v-if="report.unmatched.length"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        <div class="text-subtitle-2 mb-1">
          Unmatched in catalog ({{ report.unmatched.length }})
        </div>
        <ul class="mb-0 pl-4">
          <li v-for="(p, i) in report.unmatched" :key="i">
            {{ p.slot }}.{{ p.layer }} — {{ p.raw }}
          </li>
        </ul>
      </v-alert>

      <div v-if="!report.slots.length" class="text-body-2 text-medium-emphasis">
        No slot upgrades found for the current filters.
      </div>

      <section
        v-for="slot in report.slots"
        :key="`${slot.slot}.${slot.layer}`"
        class="slot-block mb-5"
      >
        <h2 class="text-subtitle-1 mb-2">
          [{{ slot.slot }}.{{ slot.layer }}]
          <span v-if="slot.empty" class="text-medium-emphasis font-weight-regular">
            — nothing equipped
          </span>
          <span v-else-if="slot.unmatchedRaw" class="text-warning font-weight-regular">
            — not in catalog: {{ slot.unmatchedRaw }}
          </span>
        </h2>

        <div v-if="slot.equipped?.catalogItem" class="equipped-row mb-2">
          <router-link
            class="item-link"
            :to="{
              name: 'item',
              params: { itemKey: String(slot.equipped.catalogItem.catalogKey) },
              query: route.query,
            }"
          >
            {{ slot.equipped.catalogItem.name }}
          </router-link>
          <span class="score-chip equipped">{{ formatScore(slot.equipped.score) }}</span>
          <span class="text-caption text-medium-emphasis ml-2">equipped</span>
        </div>

        <ul v-if="slot.upgrades.length" class="upgrade-list">
          <li v-for="up in slot.upgrades" :key="String(up.item.catalogKey)">
            <router-link
              class="item-link"
              :to="{
                name: 'item',
                params: { itemKey: String(up.item.catalogKey) },
                query: route.query,
              }"
            >
              {{ up.item.name }}
            </router-link>
            <span class="score-chip">{{ formatScore(up.score) }}</span>
            <span class="text-caption text-medium-emphasis">
              level {{ up.item.Level }} · Δ{{ formatScore(up.delta) }}
            </span>
          </li>
        </ul>
        <p v-else class="text-body-2 text-medium-emphasis mb-0">No upgrades for this slot.</p>
      </section>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { parseEquipmentPaste } from '../audit/parseEquipment'
import { runEquipmentAudit, type AuditReport } from '../audit/runAudit'
import { useCatalogFilters } from '../composables/useCatalogFilters'
import { formatWeightedScore } from '../presets/weightedScore'
import { usePresets } from '../presets/usePresets'
import { useCatalogStore } from '../store'

const route = useRoute()
const store = useCatalogStore()
const {
  characterProfiles,
  activeWeightConfigId,
  activeWeightConfig,
  activeCharacterProfileId,
  activeCharacterProfile,
  characterProfileSelectItems,
  weightConfigSelectItems,
  upsertCharacterProfile,
} = usePresets()

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
  ensureFilterSync,
} = useCatalogFilters()

ensureFilterSync()

if (!store.catalog) store.fetchCatalog()

const activeCharacterStats = computed(
  () => activeCharacterProfile.value?.stats ?? null,
)

const placeholder = `     +++ Equipment +++
worn on body              under  a deerhunter's dark silk torso pad   excellent
worn around neck          base   a shell necklace                    perfect`

const pasteText = ref('')
const verbose = ref(false)
const sidegrades = ref(false)
const attempted = ref(false)
const report = ref<AuditReport | null>(null)
const parseErrors = ref<string[]>([])

const scoringMode = computed(() => {
  if (activeWeightConfig.value) return 'weighted'
  if (itemProperty.value) return 'property'
  return 'none'
})

const canRun = computed(() => !!pasteText.value.trim() && !!store.catalog?.length)

watch(
  activeCharacterProfile,
  (profile) => {
    if (profile?.equipmentPaste && !pasteText.value.trim()) {
      pasteText.value = profile.equipmentPaste
    }
  },
  { immediate: true },
)

const onProfileChange = (id: string | null) => {
  activeCharacterProfileId.value = id
  if (!id) return
  const profile = characterProfiles.value.find((c) => c.id === id)
  if (profile?.equipmentPaste) {
    pasteText.value = profile.equipmentPaste
  }
}

const formatScore = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatWeightedScore(n)
}

const currentFilterState = () => ({
  searchText: searchText.value,
  levelRange: levelRange.value as [number, number],
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
  weights: activeWeightConfig.value?.weights ?? null,
  characterStats: activeCharacterStats.value,
})

const runAudit = () => {
  attempted.value = true
  if (!store.catalog) return
  const parse = parseEquipmentPaste(pasteText.value)
  parseErrors.value = parse.errors
  if (!parse.pieces.length) {
    report.value = null
    parseErrors.value = [
      ...parse.errors,
      'No equipment lines parsed. Expect slot, layer, item name, and condition.',
    ]
    return
  }
  report.value = runEquipmentAudit({
    parse,
    catalog: store.catalog,
    filterState: currentFilterState(),
    verbose: verbose.value,
    sidegrades: sidegrades.value,
  })
}

const savePasteToProfile = () => {
  const profile = activeCharacterProfile.value
  if (!profile) return
  const paste = pasteText.value.trim()
  upsertCharacterProfile({
    ...profile,
    ...(paste ? { equipmentPaste: paste } : { equipmentPaste: undefined }),
  })
}

watch(
  [
    activeWeightConfigId,
    itemProperty,
    levelRange,
    charAlignment,
    charClass,
    charRace,
    charGender,
  ],
  () => {
    if (report.value) runAudit()
  },
)
</script>

<style scoped>
.content-shell {
  max-width: 960px;
}

.mono-field :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.35;
}

.slot-block {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-top: 0.75rem;
}

.upgrade-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.upgrade-list li,
.equipped-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  padding: 0.25rem 0;
}

.item-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.item-link:hover {
  text-decoration: underline;
}

.score-chip {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
}
.score-chip.equipped {
  color: rgb(var(--v-theme-error));
}
</style>
