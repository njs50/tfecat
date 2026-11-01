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
        Softcaps like Mudlet <code>tcat</code>: positive Str/Int/Wis/Dex/Con props are ignored once that
        stat is ≥ 30. Defaults are 15; allowed range {{ STAT_MIN }}–{{ STAT_MAX }}.
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
        <v-btn variant="text" @click="emit('close')">Done</v-btn>
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
import type { CharacterProfile, CharacterStats } from '../presets/types'
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

const loadDraft = (profile: CharacterProfile) => {
  draft.value = {
    ...profile,
    stats: { ...DEFAULT_CHARACTER_STATS, ...(profile.stats ?? {}) },
  }
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

const save = () => {
  if (!draft.value) return
  let name = draft.value.name.trim() || 'Untitled'
  if (name === UNSAVED_PRESET_LABEL) {
    name = 'Untitled'
  }
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
