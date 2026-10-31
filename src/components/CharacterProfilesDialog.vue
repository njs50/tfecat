<template>
  <v-card class="modal-card">
      <v-card-title class="modal-title d-flex align-center justify-space-between">
        <span>Character profiles</span>
        <v-btn icon variant="text" @click="emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="modal-content pa-4">
        <p class="text-body-2 text-medium-emphasis mb-3">
          Selecting a profile presets alignment, race, class, gender, and level range (1 … character level).
          Saved profiles persist in this browser.
        </p>

        <v-row class="align-center mb-2" dense>
          <v-col cols="12" sm="8">
            <v-select
              v-model="editingId"
              :items="profileItems"
              label="Edit profile"
              density="compact"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="12" sm="4" class="d-flex justify-end">
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="startNew">
              New
            </v-btn>
          </v-col>
        </v-row>

        <template v-if="draft">
          <v-text-field
            v-model="draft.name"
            label="Name"
            density="compact"
            class="mb-2"
            hide-details="auto"
          ></v-text-field>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-slider
                v-model="draft.level"
                min="1"
                max="90"
                step="1"
                thumb-label
                label="Level"
                hide-details
                density="compact"
              ></v-slider>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="draft.level"
                type="number"
                min="1"
                max="90"
                label="Level"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="draft.alignment"
                :items="alignments"
                label="Alignment"
                density="compact"
                clearable
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="draft.race"
                :items="races"
                label="Race"
                density="compact"
                clearable
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="draft.class"
                :items="classes"
                label="Class"
                density="compact"
                clearable
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6">
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

          <div class="text-subtitle-2 mt-3 mb-1">Stats (softcaps)</div>
          <p class="text-body-2 text-medium-emphasis mb-2">
            Used like Mudlet <code>tcat</code>: positive Str/Int/Wis/Dex/Con props are ignored once that stat is ≥ 30.
            Leave blank to treat as 0.
          </p>
          <v-row dense>
            <v-col v-for="key in statKeys" :key="key" cols="6" sm="4" md="2">
              <v-text-field
                v-model.number="draft.stats[key]"
                :label="key"
                type="number"
                min="0"
                max="100"
                density="compact"
                clearable
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions class="modal-actions pa-4">
        <v-btn
          color="error"
          variant="text"
          :disabled="!editingId || isNew"
          @click="remove"
        >
          Delete
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="emit('close')">Close</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="!draft" @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { newId } from '../presets/storage'
import { EMPTY_CHARACTER_STATS } from '../presets/types'
import type { CharacterProfile, CharacterStats } from '../presets/types'

const statKeys: (keyof CharacterStats)[] = ['Str', 'Int', 'Wis', 'Dex', 'Con']

const props = defineProps<{
  profiles: CharacterProfile[]
  alignments: string[]
  races: string[]
  classes: string[]
  genders: string[]
  /** Optional profile id to open for editing (from /characters/:id). */
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
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((c) => ({ title: c.name, value: c.id })),
)

const loadDraft = (profile: CharacterProfile) => {
  draft.value = {
    ...profile,
    stats: { ...EMPTY_CHARACTER_STATS, ...(profile.stats ?? {}) },
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
    stats: { ...EMPTY_CHARACTER_STATS },
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

watch(
  () => props.startId,
  () => {
    openEditor()
  },
)

watch(editingId, (id) => {
  if (!id || isNew.value) {
    return
  }
  const profile = props.profiles.find((c) => c.id === id)
  if (profile) {
    isNew.value = false
    loadDraft(profile)
  }
})

const save = () => {
  if (!draft.value) {
    return
  }
  const level = Math.min(90, Math.max(1, Math.round(Number(draft.value.level) || 1)))
  const sanitizeStat = (v: number | null | undefined): number | null => {
    if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) {
      return null
    }
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    return Math.min(100, Math.max(0, Math.round(n)))
  }
  const saved: CharacterProfile = {
    ...draft.value,
    name: draft.value.name.trim() || 'Untitled',
    level,
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
  if (!editingId.value || isNew.value) {
    return
  }
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
