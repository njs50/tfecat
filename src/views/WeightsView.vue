<template>
  <v-container fluid class="pa-2" style="max-width: 760px;">
    <v-btn
      class="mb-2"
      variant="tonal"
      density="compact"
      prepend-icon="mdi-arrow-left"
      @click="goBack"
    >
      Back to search
    </v-btn>
    <WeightConfigsDialog
      :configs="weightConfigs"
      :property-options="itemProperties"
      :start-id="id ?? null"
      @save="upsertWeightConfig"
      @remove="deleteWeightConfig"
      @close="goBack"
    />
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WeightConfigsDialog from '../components/WeightConfigsDialog.vue'
import { usePresets } from '../presets/usePresets'
import { useCatalogStore } from '../store'

defineProps<{ id?: string }>()

const store = useCatalogStore()
const router = useRouter()
const route = useRoute()
const { weightConfigs, upsertWeightConfig, deleteWeightConfig } = usePresets()

onMounted(() => {
  if (!store.catalog) {
    store.fetchCatalog()
  }
})

const itemProperties = computed(() => store.itemProperties ?? [])

const goBack = () => {
  router.push({ name: 'catalog', query: route.query })
}
</script>
