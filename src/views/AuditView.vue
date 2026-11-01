<template>
  <v-container fluid class="content-shell px-4 px-sm-6 px-md-8 pt-4 pb-10">
    <v-row dense class="mb-1">
      <v-col class="d-flex align-center ga-1" cols="12" md="6">
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

      <v-col class="d-flex align-center ga-1" cols="12" md="6">
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

    <div class="d-flex flex-wrap ga-4 mb-2">
      <v-checkbox
        v-model="manualCharacter"
        label="Manually configure character"
        density="compact"
        hide-details
      ></v-checkbox>
      <v-checkbox
        v-model="manualWeight"
        label="Manually configure scoring"
        density="compact"
        hide-details
      ></v-checkbox>
    </div>

    <v-row v-if="manualCharacter" dense class="mb-1">
      <v-col cols="6" sm="4" md="2">
        <v-text-field
          v-model.number="levelMax"
          type="number"
          :min="1"
          :max="LEVEL_MAX"
          step="1"
          label="Level"
          density="compact"
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-select
          v-model="charAlignment"
          :items="charAlignments"
          label="Alignment"
          density="compact"
          clearable
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-select
          v-model="charRace"
          :items="charRaces"
          label="Race"
          density="compact"
          clearable
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="3">
        <v-select
          v-model="charClass"
          :items="charClasses"
          label="Class"
          density="compact"
          clearable
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="3">
        <v-select
          v-model="charGender"
          :items="charGenders"
          label="Gender"
          density="compact"
          clearable
          hide-details
        ></v-select>
      </v-col>
    </v-row>

    <v-row v-if="manualWeight" dense class="mb-2">
      <v-col cols="12" md="6">
        <v-autocomplete
          :model-value="itemPropertyDisplay"
          :items="itemPropertyItems"
          label="Item property"
          density="compact"
          :clearable="!selectedWeight"
          hide-details
          :disabled="!!selectedWeight"
          @update:model-value="onItemPropertyUpdate"
        ></v-autocomplete>
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
        v-if="activeCharacterProfileId"
        variant="tonal"
        :disabled="!pasteText.trim()"
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
      Select a weight config, or enable manual scoring and pick an item property.
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
            :to="itemLink(String(slot.equipped.catalogItem.catalogKey))"
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
              :to="itemLink(String(up.item.catalogKey))"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseEquipmentPaste } from '../audit/parseEquipment'
import { runEquipmentAudit, type AuditReport } from '../audit/runAudit'
import { itemOverlayLocation } from '../composables/useItemOverlay'
import { LEVEL_MAX } from '../presets/constants'
import { formatWeightedScore } from '../presets/weightedScore'
import { usePresets } from '../presets/usePresets'
import { useCatalogStore } from '../store'

/** keep-alive include name in App.vue — preserves paste/report across item overlay. */
defineOptions({ name: 'AuditView' })

const router = useRouter()
const route = useRoute()
const store = useCatalogStore()

const itemLink = (itemKey: string) => itemOverlayLocation(itemKey, route)
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
const levelMax = ref(90)
const charAlignment = ref<string | null>(null)
const charRace = ref<string | null>(null)
const charClass = ref<string | null>(null)
const charGender = ref<string | null>(null)

const pasteText = ref('')
const verbose = ref(false)
const sidegrades = ref(false)
const attempted = ref(false)
const report = ref<AuditReport | null>(null)
const parseErrors = ref<string[]>([])

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

const itemPropertyDisplay = computed(() =>
  selectedWeight.value ? 'weighted' : itemProperty.value,
)
const itemPropertyItems = computed(() =>
  selectedWeight.value ? ['weighted'] : (store.itemProperties ?? []),
)

const scoringMode = computed(() => {
  if (selectedWeight.value) return 'weighted'
  if (itemProperty.value) return 'property'
  return 'none'
})

const canRun = computed(() => !!pasteText.value.trim() && !!store.catalog?.length)

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

/** Seed local manual fields + empty paste from the shared active profile. */
const hydrateFromProfile = (id: string | null) => {
  if (!id) return
  const profile = characterProfiles.value.find((p) => p.id === id)
  if (!profile) return
  if (!manualCharacter.value) {
    levelMax.value = profile.level
    charAlignment.value = profile.alignment
    charRace.value = profile.race
    charClass.value = profile.class
    charGender.value = profile.gender
  }
  if (profile.equipmentPaste && !pasteText.value.trim()) {
    pasteText.value = profile.equipmentPaste
  }
}

const onProfileChange = (id: string | null) => {
  activeCharacterProfileId.value = id
  if (id) {
    const profile = characterProfiles.value.find((p) => p.id === id)
    if (profile) {
      levelMax.value = profile.level
      charAlignment.value = profile.alignment
      charRace.value = profile.race
      charClass.value = profile.class
      charGender.value = profile.gender
      if (profile.equipmentPaste) {
        pasteText.value = profile.equipmentPaste
      }
    }
  }
}

const onWeightChange = (id: string | null) => {
  activeWeightConfigId.value = id
  if (id) {
    itemProperty.value = null
  }
}

const onItemPropertyUpdate = (value: string | null) => {
  if (selectedWeight.value) return
  itemProperty.value = value
}

const formatScore = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatWeightedScore(n)
}

const effectiveCharacterFilters = () => {
  if (manualCharacter.value || !selectedProfile.value) {
    return {
      levelRange: [1, levelMax.value] as [number, number],
      charAlignment: charAlignment.value,
      charClass: charClass.value,
      charRace: charRace.value,
      charGender: charGender.value,
    }
  }
  return {
    levelRange: [1, selectedProfile.value.level] as [number, number],
    charAlignment: selectedProfile.value.alignment,
    charClass: selectedProfile.value.class,
    charRace: selectedProfile.value.race,
    charGender: selectedProfile.value.gender,
  }
}

const currentFilterState = () => {
  const chars = effectiveCharacterFilters()
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
    itemProperty: selectedWeight.value ? null : itemProperty.value,
    itemSlot: null,
    itemLayer: null,
    weights: selectedWeight.value?.weights ?? null,
    characterStats: characterStats.value,
  }
}

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
  const profile = selectedProfile.value
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
    activeCharacterProfileId,
    itemProperty,
    levelMax,
    charAlignment,
    charClass,
    charRace,
    charGender,
    manualCharacter,
    manualWeight,
  ],
  () => {
    if (report.value) runAudit()
  },
)

// Shared selection changed elsewhere (e.g. filters page) — refresh paste/manual seeds.
watch(activeCharacterProfileId, (id) => {
  hydrateFromProfile(id)
})

watch(activeWeightConfigId, (id) => {
  if (id) itemProperty.value = null
})

onMounted(() => {
  if (!store.catalog) store.fetchCatalog()
  hydrateFromProfile(activeCharacterProfileId.value)
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
