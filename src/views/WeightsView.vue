<template>
  <v-container fluid class="content-shell px-6 px-sm-8 pt-4 pb-10" style="max-width: 900px;">
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <nav class="text-body-2" aria-label="Breadcrumb">
        <router-link :to="{ name: 'catalog', query: route.query }" class="crumb-link">
          Item Search
        </router-link>
        <span class="mx-1 text-medium-emphasis">›</span>
        <span>Weight configurations</span>
      </nav>
      <v-spacer></v-spacer>
      <v-btn
        variant="tonal"
        density="compact"
        :prepend-icon="shareCopied ? 'mdi-check' : 'mdi-share-variant'"
        @click="onShare"
      >
        {{ shareCopied ? 'Copied' : 'Share' }}
      </v-btn>
    </div>

    <h1 class="text-h6 mb-3">Weight configurations</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Each property amount × its weight is summed into a Score on search. Saved sets stay in this browser.
    </p>

    <WeightConfigsDialog
      :configs="weightConfigs"
      :property-options="itemProperties"
      :start-id="id ?? null"
      @save="onSave"
      @remove="deleteWeightConfig"
      @close="goBack"
    />
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WeightConfigsDialog from '../components/WeightConfigsDialog.vue'
import { catalogQueryToState } from '../composables/useCatalogQuery'
import { copyShareLink, useShareFeedback } from '../composables/useShareLink'
import { usePresets } from '../presets/usePresets'
import { useCatalogStore } from '../store'
import type { WeightConfig } from '../presets/types'

const props = defineProps<{ id?: string }>()

const store = useCatalogStore()
const router = useRouter()
const route = useRoute()
const {
  weightConfigs,
  activeWeightConfig,
  activeCharacterProfile,
  activeWeightConfigId,
  upsertWeightConfig,
  deleteWeightConfig,
} = usePresets()
const { shareCopied, flashCopied } = useShareFeedback()

onMounted(() => {
  if (!store.catalog) store.fetchCatalog()
})

const itemProperties = computed(() => store.itemProperties ?? [])

const goBack = () => {
  router.push({ name: 'catalog', query: route.query })
}

const onSave = (config: WeightConfig) => {
  const saved = upsertWeightConfig(config)
  activeWeightConfigId.value = saved.id
  goBack()
}

const onShare = async () => {
  const parsed = catalogQueryToState(route.query)
  const ok = await copyShareLink({
    router,
    route: { ...route, path: '/', name: 'catalog' } as any,
    filterState: {
      searchText: parsed.searchText ?? '',
      levelRange: parsed.levelRange ?? [0, 90],
      charAlignment: parsed.charAlignment ?? null,
      charClass: parsed.charClass ?? null,
      charRace: parsed.charRace ?? null,
      charGender: parsed.charGender ?? null,
      itemType: parsed.itemType ?? null,
      itemClass: parsed.itemClass ?? null,
      itemAffect: parsed.itemAffect ?? null,
      itemProperty: parsed.itemProperty ?? null,
      itemSlot: parsed.itemSlot ?? null,
      itemLayer: parsed.itemLayer ?? null,
      activeWeightConfigId: activeWeightConfig.value?.id ?? null,
      activeCharacterProfileId: activeCharacterProfile.value?.id ?? null,
    },
    activeProfile: activeCharacterProfile.value,
    activeWeights: activeWeightConfig.value,
  })
  if (ok) flashCopied()
}
</script>

<style scoped>
.content-shell { max-width: 1280px; }

.crumb-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.crumb-link:hover {
  text-decoration: underline;
}
</style>
