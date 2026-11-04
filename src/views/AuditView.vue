<template>
  <v-container fluid class="content-shell px-4 px-sm-6 px-md-8 pt-4 pb-10">
    <v-row dense class="mb-3 align-center">
      <v-col class="d-flex align-center ga-1" cols="12" md="4">
        <v-select
          :model-value="activeCharacterProfileId"
          :items="characterProfileSelectItems"
          label="Character profile"
          density="compact"
          clearable
          hide-details
          class="flex-grow-1"
          @update:model-value="onProfileChange"
        ></v-select>
        <v-btn
          icon
          variant="tonal"
          density="compact"
          aria-label="Edit character profiles"
          @click="openCharactersEditor"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </v-col>

      <v-col class="d-flex align-center ga-1" cols="12" md="4">
        <v-select
          :model-value="activeGearSetId"
          :items="gearSetSelectItems"
          label="Gear set"
          density="compact"
          clearable
          hide-details
          class="flex-grow-1"
          :disabled="!selectedProfile"
          @update:model-value="onGearSetChange"
        ></v-select>
        <v-btn
          icon
          variant="tonal"
          density="compact"
          aria-label="Edit gear sets on character profile"
          :disabled="!selectedProfile"
          @click="openCharactersEditor"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </v-col>

      <v-col class="d-flex align-center ga-1" cols="12" md="4">
        <v-select
          :model-value="activeWeightConfigId"
          :items="weightConfigSelectItems"
          label="Weight config"
          density="compact"
          clearable
          hide-details
          class="flex-grow-1"
          @update:model-value="onWeightChange"
        ></v-select>
        <v-btn
          icon
          variant="tonal"
          density="compact"
          aria-label="Edit weight configurations"
          @click="openWeightsEditor"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <template v-if="showPasteInput">
      <v-textarea
        v-model="pasteText"
        label="Equipment paste"
        auto-grow
        rows="8"
        max-rows="20"
        density="compact"
        hide-details="auto"
        spellcheck="false"
        class="mono-field mb-2"
        :placeholder="placeholder"
      ></v-textarea>

      <div
        v-if="selectedProfile && pasteNewGearSet"
        class="d-flex flex-wrap align-center ga-2 mb-3"
      >
        <v-text-field
          v-model="gearSetName"
          label="Gear set name"
          density="compact"
          hide-details
          class="gear-set-name-field"
        ></v-text-field>
        <v-btn
          color="primary"
          variant="tonal"
          :disabled="!canSaveGearSet"
          @click="saveGearSet"
        >
          Save gear set
        </v-btn>
      </div>
    </template>

    <v-alert
      v-if="scoringMode === 'none' && readyForAudit"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Select a weight config, or enable manual scoring and pick an item property.
    </v-alert>

    <v-alert
      v-if="!effectivePaste.trim() && selectedProfile && !pasteNewGearSet"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Select a saved gear set, or enable “Paste new gear set” in options.
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

    <div class="results-toolbar d-flex flex-wrap align-center ga-2 mb-3">
      <p v-if="report?.gearTotal != null" class="text-body-2 mb-0">
        Total equipped {{ report.propertyLabel }}:
        <strong class="mono-num">{{ formatScore(report.gearTotal) }}</strong>
      </p>
      <v-spacer></v-spacer>
      <v-btn
        icon
        variant="tonal"
        density="compact"
        :aria-label="showAuditOptions ? 'Hide audit options' : 'Show audit options'"
        :aria-pressed="showAuditOptions"
        @click="showAuditOptions = !showAuditOptions"
      >
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </div>

    <div
      v-show="showAuditOptions"
      class="audit-options-panel mb-3"
      role="region"
      aria-label="Audit options"
    >
      <v-row dense>
        <v-col cols="12" md="4" class="audit-options-col">
          <v-checkbox
            :model-value="manualCharacterEffective"
            label="Manually configure character"
            density="compact"
            hide-details
            class="mb-2"
            :disabled="!selectedProfile"
            @update:model-value="onManualCharacterToggle"
          ></v-checkbox>
          <template v-if="manualCharacterEffective">
            <v-text-field
              v-model.number="levelMax"
              type="number"
              :min="1"
              :max="LEVEL_MAX"
              step="1"
              label="Level"
              density="compact"
              hide-details
              class="mb-2"
            ></v-text-field>
            <v-select
              v-model="charAlignment"
              :items="charAlignments"
              label="Alignment"
              density="compact"
              clearable
              hide-details
              class="mb-2"
            ></v-select>
            <v-select
              v-model="charRace"
              :items="charRaces"
              label="Race"
              density="compact"
              clearable
              hide-details
              class="mb-2"
            ></v-select>
            <v-select
              v-model="charClass"
              :items="charClasses"
              label="Class"
              density="compact"
              clearable
              hide-details
              class="mb-2"
            ></v-select>
            <v-select
              v-model="charGender"
              :items="charGenders"
              label="Gender"
              density="compact"
              clearable
              hide-details
            ></v-select>
          </template>
        </v-col>

        <v-col cols="12" md="4" class="audit-options-col">
          <v-checkbox
            :model-value="manualWeightEffective"
            label="Manually configure scoring"
            density="compact"
            hide-details
            class="mb-2"
            :disabled="!selectedWeight"
            @update:model-value="onManualWeightToggle"
          ></v-checkbox>
          <v-autocomplete
            v-if="manualWeightEffective"
            :model-value="itemPropertyDisplay"
            :items="itemPropertyItems"
            label="Item property"
            density="compact"
            :clearable="!selectedWeight || manualWeight"
            hide-details
            class="mb-2"
            :disabled="!!selectedWeight && !manualWeight"
            @update:model-value="onItemPropertyUpdate"
          ></v-autocomplete>
          <v-checkbox
            v-if="selectedProfile"
            v-model="pasteNewGearSet"
            label="Paste new gear set"
            density="compact"
            hide-details
          ></v-checkbox>
        </v-col>

        <v-col cols="12" md="4" class="audit-options-col">
          <v-checkbox
            v-model="verbose"
            label="Show empty slots"
            density="compact"
            hide-details
            class="mb-2"
          ></v-checkbox>
          <v-checkbox
            v-model="sidegrades"
            label="Include sidegrades"
            density="compact"
            hide-details
            class="mb-2"
          ></v-checkbox>
          <v-text-field
            v-model.number="sidegradePercent"
            type="number"
            min="0"
            max="100"
            step="1"
            suffix="%"
            label="Sidegrade within"
            density="compact"
            hide-details
            class="sidegrade-percent-field mb-2"
            :disabled="!sidegrades"
          ></v-text-field>
          <v-select
            v-model="filterSlots"
            :items="configSlotOptions"
            label="Wear location"
            density="compact"
            multiple
            clearable
            hide-details
            chips
            closable-chips
            class="mb-2"
          ></v-select>
          <v-select
            v-model="filterLayers"
            :items="configLayerOptions"
            label="Layer"
            density="compact"
            multiple
            clearable
            hide-details
            chips
            closable-chips
          ></v-select>
        </v-col>
      </v-row>
    </div>

    <template v-if="report">
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
            {{ formatSlotTitle(p.slot, p.layer) }} — {{ p.raw }}
          </li>
        </ul>
      </v-alert>

      <div v-if="!sortedSlots.length" class="text-body-2 text-medium-emphasis">
        No slot upgrades found for the current filters.
      </div>

      <article
        v-for="slot in sortedSlots"
        :key="`${slot.slot}.${slot.layer}`"
        class="slot-card mb-3"
        :class="{
          'slot-card--empty-options':
            !slot.unequippable && slot.empty && slot.upgrades.length > 0,
          'slot-card--unequippable': slot.unequippable,
          'slot-card--unmatched': !!slot.unmatchedRaw,
        }"
      >
        <header class="slot-card__header">
          <h2 class="slot-card__title">
            {{ formatSlotTitle(slot.slot, slot.layer) }}
          </h2>
          <span v-if="slot.unequippable" class="slot-card__meta slot-card__meta--danger">
            not equippable
          </span>
          <span v-else-if="slot.empty" class="slot-card__meta">nothing equipped</span>
          <span v-else-if="slot.unmatchedRaw" class="slot-card__meta slot-card__meta--warn">
            not in catalog
          </span>
          <span
            v-else-if="bestDelta(slot) != null"
            class="slot-card__meta mono-num"
            :class="{ 'delta--neg': (bestDelta(slot) ?? 0) < 0 }"
          >
            best Δ{{ formatScore(bestDelta(slot)) }}
          </span>
        </header>

        <div v-if="slot.unmatchedRaw" class="slot-card__unmatched text-body-2 mb-2">
          {{ slot.unmatchedRaw }}
        </div>

        <div
          v-if="slot.equipped?.catalogItem"
          class="equipped-row mb-2"
          :class="{ 'equipped-row--unequippable': slot.unequippable }"
        >
          <a
            :href="itemOverlayHref(String(slot.equipped.catalogItem.catalogKey))"
            class="item-link"
            @click="openItemOverlay(String(slot.equipped.catalogItem.catalogKey), $event)"
          >
            {{ slot.equipped.catalogItem.name }}
          </a>
          <span
            class="score-chip"
            :class="slot.unequippable ? 'unequippable' : 'equipped'"
          >
            {{ formatScore(slot.unequippable ? null : slot.equipped.score) }}
          </span>
          <span
            class="equipped-label"
            :class="{ 'equipped-label--danger': slot.unequippable }"
          >
            {{
              slot.unequippable
                ? 'Not equippable by currently configured character'
                : 'equipped'
            }}
          </span>
        </div>

        <div
          v-if="slot.upgrades.length"
          class="upgrade-scroll"
          :class="{ 'upgrade-scroll--clip': slot.upgrades.length > 5 }"
        >
          <ul class="upgrade-list">
            <li v-for="up in slot.upgrades" :key="String(up.item.catalogKey)">
              <a
                :href="itemOverlayHref(String(up.item.catalogKey))"
                class="item-link"
                @click="openItemOverlay(String(up.item.catalogKey), $event)"
              >
                {{ up.item.name }}
              </a>
              <span class="score-chip">{{ formatScore(up.score) }}</span>
              <span class="upgrade-meta" :class="{ 'delta--neg': up.delta < 0 }">
                level {{ up.item.Level }} · Δ{{ formatScore(up.delta) }}
              </span>
            </li>
          </ul>
        </div>
        <p v-else class="text-body-2 text-medium-emphasis mb-0">No options for this slot.</p>
      </article>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  EQUIPMENT_LAYERS,
  EQUIPMENT_SLOTS,
  parseEquipmentPaste,
  type EquipmentLayer,
} from '../audit/parseEquipment'
import {
  runEquipmentAudit,
  type AuditReport,
  type AuditSlotReport,
} from '../audit/runAudit'
import { useItemOverlay } from '../composables/useItemOverlay'
import { LEVEL_MAX } from '../presets/constants'
import { newId } from '../presets/storage'
import type { CharacterGearSet } from '../presets/types'
import { formatWeightedScore } from '../presets/weightedScore'
import { usePresets } from '../presets/usePresets'
import { useCatalogStore } from '../store'

/** keep-alive include name in App.vue — preserves paste/report across item overlay. */
defineOptions({ name: 'AuditView' })

const router = useRouter()
const store = useCatalogStore()
const { openItemOverlay, itemOverlayHref } = useItemOverlay()
const {
  characterProfiles,
  weightConfigs,
  activeCharacterProfileId,
  activeWeightConfigId,
  characterProfileSelectItems,
  weightConfigSelectItems,
  upsertCharacterProfile,
} = usePresets()

/**
 * Profile + weight IDs are the shared presets actives (same as catalog filters).
 * Manual character / scoring fields below stay audit-local overrides.
 */
const itemProperty = ref<string | null>(null)
const manualCharacter = ref(false)
const manualWeight = ref(false)
const pasteNewGearSet = ref(false)
const levelMax = ref(90)
const charAlignment = ref<string | null>(null)
const charRace = ref<string | null>(null)
const charClass = ref<string | null>(null)
const charGender = ref<string | null>(null)

const pasteText = ref('')
const gearSetName = ref('')
const activeGearSetId = ref<string | null>(null)
const verbose = ref(true)
const sidegrades = ref(true)
const sidegradePercent = ref(10)
const showAuditOptions = ref(false)
const report = ref<AuditReport | null>(null)
const parseErrors = ref<string[]>([])

/** Result filters — empty = no restriction (show all). */
const filterSlots = ref<string[]>([])
const filterLayers = ref<EquipmentLayer[]>([])

const placeholder = `     +++ Equipment +++
---- --------      -----   ----                                       ---------
worn on body              under  a deerhunter's dark silk torso pad   excellent
worn around neck          base   a shell necklace                    perfect
Weight: 12.50 lbs`

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

const selectedProfile = computed(
  () => characterProfiles.value.find((p) => p.id === activeCharacterProfileId.value) ?? null,
)
const selectedWeight = computed(
  () => weightConfigs.value.find((w) => w.id === activeWeightConfigId.value) ?? null,
)
const characterStats = computed(() => selectedProfile.value?.stats ?? null)

const profileGearSets = computed((): CharacterGearSet[] => {
  const sets = selectedProfile.value?.gearSets
  return Array.isArray(sets) ? sets : []
})

const gearSetSelectItems = computed(() =>
  profileGearSets.value
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((g) => ({ title: g.name, value: g.id })),
)

const selectedGearSet = computed(
  () => profileGearSets.value.find((g) => g.id === activeGearSetId.value) ?? null,
)

/** No profile → always paste; with profile → only when “paste new” is on. */
const showPasteInput = computed(() => !selectedProfile.value || pasteNewGearSet.value)

/** Paste used for audit: typed paste when shown, otherwise the selected set. */
const effectivePaste = computed(() => {
  if (showPasteInput.value) return pasteText.value
  return selectedGearSet.value?.paste ?? ''
})

/** No profile selected → treat manual character as on. */
const manualCharacterEffective = computed(
  () => !selectedProfile.value || manualCharacter.value,
)

/** No weight selected → treat manual scoring as on. */
const manualWeightEffective = computed(
  () => !selectedWeight.value || manualWeight.value,
)

const itemPropertyDisplay = computed(() =>
  selectedWeight.value && !manualWeight.value ? 'weighted' : itemProperty.value,
)
const itemPropertyItems = computed(() =>
  selectedWeight.value && !manualWeight.value
    ? ['weighted']
    : (store.itemProperties ?? []),
)

const scoringMode = computed(() => {
  if (selectedWeight.value && !manualWeight.value) return 'weighted'
  if (itemProperty.value) return 'property'
  return 'none'
})

/** Ready to evaluate once paste + catalog exist (scoring may still be missing). */
const readyForAudit = computed(
  () => !!effectivePaste.value.trim() && !!store.catalog?.length,
)

const canSaveGearSet = computed(
  () =>
    !!selectedProfile.value &&
    !!pasteText.value.trim() &&
    !!gearSetName.value.trim(),
)

const onManualCharacterToggle = (on: boolean | null) => {
  if (!selectedProfile.value) return
  manualCharacter.value = !!on
}

const onManualWeightToggle = (on: boolean | null) => {
  if (!selectedWeight.value) return
  manualWeight.value = !!on
  if (on) return
  itemProperty.value = null
}

/** Wear/layer pickers in the options panel — prefer report slots when available. */
const configSlotOptions = computed(() => {
  if (report.value?.slots.length) {
    const seen = new Set<string>()
    const opts: string[] = []
    for (const s of report.value.slots) {
      if (seen.has(s.slot)) continue
      seen.add(s.slot)
      opts.push(s.slot)
    }
    return opts
  }
  return [...EQUIPMENT_SLOTS]
})

const configLayerOptions = computed(() => [...EQUIPMENT_LAYERS])

const formatSlotTitle = (slot: string, layer: string) => `${slot} - ${layer}`

const bestDelta = (slot: AuditSlotReport): number | null => {
  if (!slot.upgrades.length) return null
  return slot.upgrades[0].delta
}

/** Filtered + sorted by biggest upgrade delta (equipped → best). */
const sortedSlots = computed((): AuditSlotReport[] => {
  if (!report.value) return []
  const slots = filterSlots.value
  const layers = filterLayers.value
  const filtered = report.value.slots.filter((s) => {
    if (slots.length && !slots.includes(s.slot)) return false
    if (layers.length && !layers.includes(s.layer)) return false
    return true
  })
  return filtered.slice().sort((a, b) => {
    const da = bestDelta(a) ?? Number.NEGATIVE_INFINITY
    const db = bestDelta(b) ?? Number.NEGATIVE_INFINITY
    if (db !== da) return db - da
    return formatSlotTitle(a.slot, a.layer).localeCompare(formatSlotTitle(b.slot, b.layer))
  })
})

const auditReturnQuery = { returnTo: 'audit' }

const openCharactersEditor = () => {
  router.push({
    name: 'characters',
    params: activeCharacterProfileId.value ? { id: activeCharacterProfileId.value } : {},
    query: auditReturnQuery,
  })
}

const openWeightsEditor = () => {
  router.push({
    name: 'weights',
    params: activeWeightConfigId.value ? { id: activeWeightConfigId.value } : {},
    query: auditReturnQuery,
  })
}

const persistProfileGearSelection = (gearSetId: string | null) => {
  const profile = selectedProfile.value
  if (!profile) return
  if (profile.activeGearSetId === gearSetId) return
  upsertCharacterProfile({
    ...profile,
    activeGearSetId: gearSetId,
  })
}

/** Seed local manual fields + gear set selection from the shared active profile. */
const hydrateFromProfile = (id: string | null) => {
  if (!id) {
    activeGearSetId.value = null
    return
  }
  const profile = characterProfiles.value.find((p) => p.id === id)
  if (!profile) return
  if (!manualCharacter.value) {
    levelMax.value = profile.level
    charAlignment.value = profile.alignment
    charRace.value = profile.race
    charClass.value = profile.class
    charGender.value = profile.gender
  }
  const sets = profile.gearSets ?? []
  const preferred =
    (profile.activeGearSetId && sets.find((g) => g.id === profile.activeGearSetId)?.id) ||
    sets[0]?.id ||
    null
  activeGearSetId.value = preferred
  if (!pasteNewGearSet.value) {
    pasteText.value = sets.find((g) => g.id === preferred)?.paste ?? ''
    gearSetName.value = sets.find((g) => g.id === preferred)?.name ?? ''
  }
}

const onProfileChange = (id: string | null) => {
  activeCharacterProfileId.value = id
  if (!id) {
    activeGearSetId.value = null
    return
  }
  const profile = characterProfiles.value.find((p) => p.id === id)
  if (!profile) return
  levelMax.value = profile.level
  charAlignment.value = profile.alignment
  charRace.value = profile.race
  charClass.value = profile.class
  charGender.value = profile.gender
  hydrateFromProfile(id)
}

const onGearSetChange = (id: string | null) => {
  activeGearSetId.value = id
  persistProfileGearSelection(id)
  if (pasteNewGearSet.value) return
  const set = profileGearSets.value.find((g) => g.id === id)
  pasteText.value = set?.paste ?? ''
  gearSetName.value = set?.name ?? ''
}

const onWeightChange = (id: string | null) => {
  activeWeightConfigId.value = id
  if (id) {
    itemProperty.value = null
  }
}

const onItemPropertyUpdate = (value: string | null) => {
  if (selectedWeight.value && !manualWeight.value) return
  itemProperty.value = value
}

const formatScore = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatWeightedScore(n)
}

const effectiveCharacterFilters = () => {
  if (manualCharacterEffective.value) {
    return {
      levelRange: [1, levelMax.value] as [number, number],
      charAlignment: charAlignment.value,
      charClass: charClass.value,
      charRace: charRace.value,
      charGender: charGender.value,
    }
  }
  const profile = selectedProfile.value!
  return {
    levelRange: [1, profile.level] as [number, number],
    charAlignment: profile.alignment,
    charClass: profile.class,
    charRace: profile.race,
    charGender: profile.gender,
  }
}

const currentFilterState = () => {
  const chars = effectiveCharacterFilters()
  const useWeights = !!selectedWeight.value && !manualWeight.value
  return {
    searchText: '',
    levelRange: chars.levelRange,
    charAlignment: chars.charAlignment,
    charClass: chars.charClass,
    charRace: chars.charRace,
    charGender: chars.charGender,
    itemType: null,
    itemClass: null,
    itemAffect: null,
    itemProperty: useWeights ? null : itemProperty.value,
    itemSlot: null,
    itemLayer: null,
    weights: useWeights ? selectedWeight.value!.weights : null,
    characterStats: characterStats.value,
  }
}

const clampSidegradePercent = () => {
  const n = Number(sidegradePercent.value)
  if (!Number.isFinite(n)) {
    sidegradePercent.value = 10
    return
  }
  sidegradePercent.value = Math.min(100, Math.max(0, Math.round(n)))
}

/** Auto-run whenever paste + catalog are ready; clear results otherwise. */
const runAudit = () => {
  if (!readyForAudit.value || !store.catalog) {
    report.value = null
    if (!effectivePaste.value.trim()) parseErrors.value = []
    return
  }
  clampSidegradePercent()
  const paste = effectivePaste.value
  const parse = parseEquipmentPaste(paste)
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
    sidegradePercent: sidegradePercent.value,
  })
  // Keep filters valid for the new report; leave user picks when still present.
  const slotSet = new Set(configSlotOptions.value)
  filterSlots.value = filterSlots.value.filter((s) => slotSet.has(s))
  const layerSet = new Set(configLayerOptions.value)
  filterLayers.value = filterLayers.value.filter((l) => layerSet.has(l))
}

const saveGearSet = () => {
  const profile = selectedProfile.value
  if (!profile) return
  const paste = pasteText.value.trim()
  const name = gearSetName.value.trim()
  if (!paste || !name) return

  const existing = (profile.gearSets ?? []).slice()
  const matchById = activeGearSetId.value
    ? existing.findIndex((g) => g.id === activeGearSetId.value)
    : -1
  const matchByName = existing.findIndex(
    (g) => g.name.toLowerCase() === name.toLowerCase(),
  )
  let next: CharacterGearSet[]
  let savedId: string
  if (matchById >= 0) {
    savedId = existing[matchById].id
    next = existing.slice()
    next[matchById] = { id: savedId, name, paste }
  } else if (matchByName >= 0) {
    savedId = existing[matchByName].id
    next = existing.slice()
    next[matchByName] = { id: savedId, name, paste }
  } else {
    savedId = newId()
    next = [...existing, { id: savedId, name, paste }]
  }

  upsertCharacterProfile({
    ...profile,
    gearSets: next,
    activeGearSetId: savedId,
    equipmentPaste: undefined,
  })
  activeGearSetId.value = savedId
  pasteNewGearSet.value = false
}

watch(pasteNewGearSet, (on) => {
  if (on) {
    if (!gearSetName.value && selectedGearSet.value) {
      gearSetName.value = selectedGearSet.value.name
    }
    return
  }
  // Leaving paste mode — restore selected gear set paste into the working buffer.
  pasteText.value = selectedGearSet.value?.paste ?? ''
  gearSetName.value = selectedGearSet.value?.name ?? ''
})

watch(activeCharacterProfileId, (id) => {
  hydrateFromProfile(id)
  if (!id) {
    // No profile → paste mode for a one-off dump (no save controls).
    pasteNewGearSet.value = false
  }
})

watch(activeWeightConfigId, (id) => {
  if (id && !manualWeight.value) itemProperty.value = null
})

watch(
  [
    activeWeightConfigId,
    activeCharacterProfileId,
    activeGearSetId,
    itemProperty,
    levelMax,
    charAlignment,
    charClass,
    charRace,
    charGender,
    manualCharacter,
    manualWeight,
    verbose,
    sidegrades,
    sidegradePercent,
    pasteNewGearSet,
    pasteText,
    () => store.catalog?.length ?? 0,
  ],
  () => {
    runAudit()
  },
)

onMounted(() => {
  if (!store.catalog) store.fetchCatalog()
  hydrateFromProfile(activeCharacterProfileId.value)
  runAudit()
})
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

.mono-num {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.gear-set-name-field {
  flex: 1 1 220px;
  max-width: 360px;
}

.sidegrade-percent-field {
  max-width: 10rem;
}

.audit-options-panel {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  padding: 0.75rem 1rem 1rem;
}

.audit-options-col {
  min-width: 0;
}

.delta--neg {
  color: #e06e64;
}

.slot-card {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  padding: 0.875rem 1rem 1rem;
}

.slot-card--empty-options {
  border-color: rgba(212, 184, 106, 0.55);
  box-shadow: inset 3px 0 0 #d4b86a;
}

.slot-card--unequippable {
  border-color: rgba(224, 110, 100, 0.55);
  box-shadow: inset 3px 0 0 #e06e64;
}

.slot-card--unmatched {
  border-color: rgba(212, 184, 106, 0.35);
}

.slot-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.65rem;
}

.slot-card__title {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  color: rgb(var(--v-theme-secondary));
}

.slot-card__meta {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-secondary));
}

.slot-card__meta--warn {
  color: #d4b86a;
}

.slot-card__meta--danger {
  color: #e06e64;
}

.slot-card__unmatched {
  color: #d4b86a;
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
  gap: 0.35rem 0.75rem;
  min-height: 2rem;
  padding: 0.2rem 0;
}

.equipped-row {
  padding: 0.35rem 0.55rem;
  margin: 0 -0.15rem 0.35rem;
  border-radius: 8px;
  background: rgba(212, 184, 106, 0.12);
  border: 1px solid rgba(212, 184, 106, 0.28);
}

.equipped-row--unequippable {
  background: rgba(224, 110, 100, 0.12);
  border-color: rgba(224, 110, 100, 0.32);
}

.equipped-label {
  font-size: 0.7rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d4b86a;
}

.equipped-label--danger {
  color: #e06e64;
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 0.75rem;
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
  color: rgb(var(--v-theme-on-surface));
}
.score-chip.equipped {
  color: #d4b86a;
  font-weight: 600;
}
.score-chip.unequippable {
  color: #e06e64;
  font-weight: 600;
}

.upgrade-meta {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-secondary));
  font-variant-numeric: tabular-nums;
}

/* ~5 rows visible; fade + inset shadow cue that the list scrolls. */
.upgrade-scroll--clip {
  max-height: 10.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 0.25rem;
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
  box-shadow: inset 0 -12px 10px -10px rgba(0, 0, 0, 0.45);
  scrollbar-gutter: stable;
}

.upgrade-scroll--clip::-webkit-scrollbar {
  width: 8px;
}
.upgrade-scroll--clip::-webkit-scrollbar-thumb {
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
}
</style>
