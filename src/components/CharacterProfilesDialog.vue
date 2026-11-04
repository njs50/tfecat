<template>
  <div>
    <v-row class="align-center mb-3" dense>
      <v-col cols="12" sm="8" md="6">
        <v-select
          v-model="editingId"
          :items="profileItems"
          label="Edit profile"
          density="compact"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" sm="4" md="6" class="d-flex justify-sm-end">
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="startNew">
          New
        </v-btn>
      </v-col>
    </v-row>

    <template v-if="draft">
      <v-row dense>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="draft.name"
            label="Name"
            density="compact"
            hide-details="auto"
            hint="Rename &lt;unsaved&gt; and Save to keep a shared profile"
            persistent-hint
            @focus="clearUnsavedNameOnFocus"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model.number="draft.level"
            type="number"
            :min="LEVEL_MIN"
            :max="LEVEL_MAX"
            step="1"
            label="Level"
            density="compact"
            hide-details
          ></v-text-field>
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="draft.alignment"
            :items="alignments"
            label="Alignment"
            density="compact"
            clearable
            hide-details
          ></v-select>
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="draft.race"
            :items="races"
            label="Race"
            density="compact"
            clearable
            hide-details
          ></v-select>
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="draft.class"
            :items="classes"
            label="Class"
            density="compact"
            clearable
            hide-details
          ></v-select>
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="draft.gender"
            :items="genders"
            label="Gender"
            density="compact"
            clearable
            hide-details
          ></v-select>
        </v-col>
      </v-row>

      <div class="text-subtitle-2 mt-4 mb-1">Stats</div>
      <p class="text-body-2 text-medium-emphasis mb-2">
        Configuring stats lets the weighted search know when you wont benefit from additional stats.
      </p>
      <v-row dense>
        <v-col v-for="key in statKeys" :key="key" cols="6" md="4">
          <v-text-field
            v-model.number="draft.stats[key]"
            :label="key"
            type="number"
            :min="STAT_MIN"
            :max="STAT_MAX"
            step="1"
            density="compact"
            hide-details
          ></v-text-field>
        </v-col>
      </v-row>

      <div class="text-subtitle-2 mt-4 mb-1">Gear sets</div>
      <p class="text-body-2 text-medium-emphasis mb-2">
        Named Mudlet <code>equipment</code> dumps for Item Audit.
        {{ gearSetSummary }}.
      </p>

      <v-row class="align-center mb-2" dense>
        <v-col cols="12" sm="8" md="7">
          <v-select
            :model-value="editingGearSetId"
            :items="gearSetItems"
            label="Edit gear set"
            density="compact"
            hide-details
            :disabled="!(draft.gearSets && draft.gearSets.length)"
            @update:model-value="onSelectGearSet"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="4" md="5" class="d-flex flex-wrap justify-sm-end ga-2">
          <v-btn
            variant="tonal"
            density="compact"
            prepend-icon="mdi-plus"
            @click="startNewGearSet"
          >
            New gear set
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            density="compact"
            :disabled="!editingGearSetId"
            @click="removeGearSet"
          >
            Delete set
          </v-btn>
        </v-col>
      </v-row>

      <template v-if="gearSetDraft">
        <v-text-field
          v-model="gearSetDraft.name"
          label="Gear set name"
          density="compact"
          class="mb-2"
          hide-details
        ></v-text-field>
        <v-textarea
          v-model="gearSetDraft.paste"
          label="Equipment paste"
          auto-grow
          rows="6"
          max-rows="16"
          density="compact"
          hide-details="auto"
          spellcheck="false"
          class="equipment-paste mb-2"
          :placeholder="equipmentPlaceholder"
        ></v-textarea>
      </template>
      <p v-else class="text-body-2 text-medium-emphasis mb-2">
        No gear set selected — add one with New gear set.
      </p>

      <div class="d-flex flex-wrap ga-2 mt-4">
        <v-btn
          color="error"
          variant="text"
          :disabled="!canDelete"
          @click="remove"
        >
          Delete
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="emit('close')">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="!draft" @click="save">
          Save
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { newId } from '../presets/storage'
import {
  LEVEL_MAX,
  LEVEL_MIN,
  STAT_MAX,
  STAT_MIN,
  UNSAVED_PRESET_ID,
  UNSAVED_PRESET_LABEL,
} from '../presets/constants'
import { DEFAULT_CHARACTER_STATS } from '../presets/types'
import type { CharacterGearSet, CharacterProfile, CharacterStats } from '../presets/types'
import { clampProfileLevel } from '../composables/useCatalogQuery'

const statKeys: (keyof CharacterStats)[] = ['Str', 'Int', 'Wis', 'Dex', 'Con']

const props = defineProps<{
  profiles: CharacterProfile[]
  alignments: string[]
  races: string[]
  classes: string[]
  genders: string[]
  startId?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [profile: CharacterProfile]
  remove: [id: string]
}>()

const editingId = ref<string | null>(null)
const isNew = ref(false)
const draft = ref<CharacterProfile | null>(null)
const editingGearSetId = ref<string | null>(null)

const equipmentPlaceholder = `     +++ Equipment +++
worn on body              under  a deerhunter's dark silk torso pad   excellent
worn around neck          base   a shell necklace                    perfect`

const profileItems = computed(() =>
  props.profiles
    .slice()
    .sort((a, b) => {
      if (a.id === UNSAVED_PRESET_ID) return -1
      if (b.id === UNSAVED_PRESET_ID) return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    .map((c) => ({ title: c.name, value: c.id })),
)

const canDelete = computed(
  () => !!editingId.value && !isNew.value && editingId.value !== UNSAVED_PRESET_ID,
)

const gearSetItems = computed(() =>
  (draft.value?.gearSets ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((g) => ({ title: g.name || 'Untitled gear', value: g.id })),
)

/** Live reference into draft.gearSets — name/paste edits mutate in place. */
const gearSetDraft = computed((): CharacterGearSet | null => {
  if (!draft.value || !editingGearSetId.value) return null
  return draft.value.gearSets?.find((g) => g.id === editingGearSetId.value) ?? null
})

const gearSetSummary = computed(() => {
  const n = draft.value?.gearSets?.length ?? 0
  if (n === 0) return 'None saved yet'
  if (n === 1) return '1 saved'
  return `${n} saved`
})

const selectGearSet = (id: string | null) => {
  editingGearSetId.value = id
  if (draft.value) {
    draft.value.activeGearSetId = id
  }
}

const onSelectGearSet = (id: string | null) => {
  selectGearSet(id)
}

const startNewGearSet = () => {
  if (!draft.value) return
  const set: CharacterGearSet = {
    id: newId(),
    name: 'New gear set',
    paste: '',
  }
  draft.value.gearSets = [...(draft.value.gearSets ?? []), set]
  selectGearSet(set.id)
}

const removeGearSet = () => {
  if (!draft.value || !editingGearSetId.value) return
  const id = editingGearSetId.value
  const next = (draft.value.gearSets ?? []).filter((g) => g.id !== id)
  draft.value.gearSets = next
  selectGearSet(next[0]?.id ?? null)
}

const loadDraft = (profile: CharacterProfile) => {
  const gearSets = profile.gearSets ? profile.gearSets.map((g) => ({ ...g })) : []
  const active =
    (profile.activeGearSetId && gearSets.find((g) => g.id === profile.activeGearSetId)?.id) ||
    gearSets[0]?.id ||
    null
  draft.value = {
    ...profile,
    stats: { ...DEFAULT_CHARACTER_STATS, ...(profile.stats ?? {}) },
    gearSets,
    activeGearSetId: active,
  }
  editingGearSetId.value = active
}

const startNew = () => {
  isNew.value = true
  editingId.value = null
  loadDraft({
    id: newId(),
    name: 'New character',
    level: 50,
    alignment: null,
    race: null,
    class: null,
    gender: null,
    stats: { ...DEFAULT_CHARACTER_STATS },
    gearSets: [],
    activeGearSetId: null,
  })
}

const openEditor = () => {
  isNew.value = false
  const start = props.startId
    ? props.profiles.find((c) => c.id === props.startId)
    : null
  if (start) {
    editingId.value = start.id
    loadDraft(start)
  } else if (props.profiles.length) {
    editingId.value = props.profiles[0].id
    loadDraft(props.profiles[0])
  } else {
    startNew()
  }
}

onMounted(openEditor)
watch(() => props.startId, openEditor)
watch(
  () => props.profiles,
  () => {
    if (props.startId === UNSAVED_PRESET_ID) {
      openEditor()
    }
  },
  { deep: true },
)

watch(editingId, (id) => {
  if (!id || isNew.value) return
  const profile = props.profiles.find((c) => c.id === id)
  if (profile) {
    isNew.value = false
    loadDraft(profile)
  }
})

const sanitizeStat = (v: number | null | undefined): number => {
  const n = Number(v)
  if (!Number.isFinite(n)) return DEFAULT_CHARACTER_STATS.Str!
  return Math.min(STAT_MAX, Math.max(STAT_MIN, Math.round(n)))
}

/** Placeholder names — clear on focus so the user can type without deleting first. */
const clearUnsavedNameOnFocus = () => {
  const name = draft.value?.name
  if (name === UNSAVED_PRESET_LABEL || name === 'New character') {
    draft.value!.name = ''
  }
}

const save = () => {
  if (!draft.value) return
  let name = draft.value.name.trim() || 'Untitled'
  if (name === UNSAVED_PRESET_LABEL) {
    name = 'Untitled'
  }
  const gearSets = (draft.value.gearSets ?? [])
    .map((g) => ({
      id: g.id,
      name: g.name.trim() || 'Untitled gear',
      paste: g.paste,
    }))
    .filter((g) => g.paste.trim())
  const activeGearSetId =
    draft.value.activeGearSetId && gearSets.some((g) => g.id === draft.value!.activeGearSetId)
      ? draft.value.activeGearSetId
      : gearSets[0]?.id ?? null
  const saved: CharacterProfile = {
    ...draft.value,
    name,
    level: clampProfileLevel(draft.value.level),
    stats: {
      Str: sanitizeStat(draft.value.stats?.Str),
      Int: sanitizeStat(draft.value.stats?.Int),
      Wis: sanitizeStat(draft.value.stats?.Wis),
      Dex: sanitizeStat(draft.value.stats?.Dex),
      Con: sanitizeStat(draft.value.stats?.Con),
    },
    gearSets,
    activeGearSetId,
    equipmentPaste: undefined,
  }
  emit('save', saved)
  isNew.value = false
  editingId.value = saved.id
  loadDraft(saved)
}

const remove = () => {
  if (!editingId.value || isNew.value || editingId.value === UNSAVED_PRESET_ID) return
  const id = editingId.value
  emit('remove', id)
  const remaining = props.profiles.filter((c) => c.id !== id)
  if (remaining.length) {
    editingId.value = remaining[0].id
    loadDraft(remaining[0])
  } else {
    startNew()
  }
}
</script>

<style scoped>
.equipment-paste :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.35;
}
</style>
