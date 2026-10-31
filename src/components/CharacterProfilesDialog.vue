<template>
  <v-dialog :model-value="modelValue" max-width="640" @update:model-value="emit('update:modelValue', $event)">
    <v-card class="modal-card">
      <v-card-title class="modal-title d-flex align-center justify-space-between">
        <span>Character profiles</span>
        <v-btn icon variant="text" @click="emit('update:modelValue', false)">
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
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="!draft" @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { newId } from '../presets/storage'
import type { CharacterProfile } from '../presets/types'

const props = defineProps<{
  modelValue: boolean
  profiles: CharacterProfile[]
  alignments: string[]
  races: string[]
  classes: string[]
  genders: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
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
  draft.value = { ...profile }
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
  })
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    isNew.value = false
    if (props.profiles.length) {
      editingId.value = props.profiles[0].id
      loadDraft(props.profiles[0])
    } else {
      startNew()
    }
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
  const saved: CharacterProfile = {
    ...draft.value,
    name: draft.value.name.trim() || 'Untitled',
    level,
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
