<template>
  <div>
    <v-row class="align-center mb-3" dense>
      <v-col cols="12" sm="8" md="6">
        <v-select
          v-model="editingId"
          :items="configItems"
          label="Edit configuration"
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
      <v-text-field
        v-model="draft.name"
        label="Name"
        density="compact"
        class="mb-3"
        hide-details="auto"
        hint="Rename &lt;unsaved&gt; and Save to keep a shared weight set"
        persistent-hint
        @focus="clearUnsavedNameOnFocus"
      ></v-text-field>

      <div class="text-subtitle-2 mb-2">Property weights</div>
      <v-row
        v-for="(row, index) in draftRows"
        :key="index"
        class="align-center mb-1"
        dense
      >
        <v-col cols="12" sm="7" md="6">
          <v-autocomplete
            v-model="row.property"
            :items="propertyOptions"
            label="Property"
            density="compact"
            hide-details
          ></v-autocomplete>
        </v-col>
        <v-col cols="8" sm="3" md="4">
          <v-text-field
            v-model.number="row.weight"
            type="number"
            step="any"
            label="Weight"
            density="compact"
            hide-details
          ></v-text-field>
        </v-col>
        <v-col cols="4" sm="2" md="2" class="d-flex justify-end">
          <v-btn icon variant="text" @click="draftRows.splice(index, 1)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-col>
      </v-row>

      <v-btn
        class="mt-2"
        variant="outlined"
        density="compact"
        prepend-icon="mdi-plus"
        @click="draftRows.push({ property: null, weight: 1 })"
      >
        Add property
      </v-btn>

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
import { UNSAVED_PRESET_ID, UNSAVED_PRESET_LABEL } from '../presets/constants'
import type { WeightConfig } from '../presets/types'

const props = defineProps<{
  configs: WeightConfig[]
  propertyOptions: string[]
  startId?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [config: WeightConfig]
  remove: [id: string]
}>()

type DraftRow = { property: string | null; weight: number }

const editingId = ref<string | null>(null)
const isNew = ref(false)
const draft = ref<WeightConfig | null>(null)
const draftRows = ref<DraftRow[]>([])

const configItems = computed(() =>
  props.configs
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

const loadDraft = (config: WeightConfig) => {
  draft.value = {
    id: config.id,
    name: config.name,
    weights: { ...config.weights },
  }
  draftRows.value = Object.entries(config.weights).map(([property, weight]) => ({
    property,
    weight,
  }))
  if (!draftRows.value.length) {
    draftRows.value.push({ property: null, weight: 1 })
  }
}

const startNew = () => {
  isNew.value = true
  editingId.value = null
  loadDraft({
    id: newId(),
    name: 'New weights',
    weights: {},
  })
}

const openEditor = () => {
  isNew.value = false
  const start = props.startId
    ? props.configs.find((c) => c.id === props.startId)
    : null
  if (start) {
    editingId.value = start.id
    loadDraft(start)
  } else if (props.configs.length) {
    editingId.value = props.configs[0].id
    loadDraft(props.configs[0])
  } else {
    startNew()
  }
}

onMounted(openEditor)
watch(() => props.startId, openEditor)
watch(
  () => props.configs,
  () => {
    if (props.startId === UNSAVED_PRESET_ID) openEditor()
  },
  { deep: true },
)

watch(editingId, (id) => {
  if (!id || isNew.value) return
  const config = props.configs.find((c) => c.id === id)
  if (config) {
    isNew.value = false
    loadDraft(config)
  }
})

/** Placeholder name — clear on focus so the user can type without deleting first. */
const clearUnsavedNameOnFocus = () => {
  if (draft.value?.name === UNSAVED_PRESET_LABEL) {
    draft.value.name = ''
  }
}

const save = () => {
  if (!draft.value) return
  const weights: Record<string, number> = {}
  for (const row of draftRows.value) {
    if (!row.property || !Number.isFinite(row.weight)) continue
    weights[row.property] = row.weight
  }
  let name = draft.value.name.trim() || 'Untitled'
  if (name === UNSAVED_PRESET_LABEL) name = 'Untitled'
  const saved: WeightConfig = {
    id: draft.value.id,
    name,
    weights,
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
  const remaining = props.configs.filter((c) => c.id !== id)
  if (remaining.length) {
    editingId.value = remaining[0].id
    loadDraft(remaining[0])
  } else {
    startNew()
  }
}
</script>
