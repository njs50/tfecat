<template>
  <v-container fluid class="content-shell px-6 px-sm-8 pt-4 pb-10" style="max-width: 900px;">
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <nav class="text-body-2" aria-label="Breadcrumb">
        <router-link :to="{ name: 'catalog', query: route.query }" class="crumb-link">
          Item Search
        </router-link>
        <span class="mx-1 text-medium-emphasis">›</span>
        <span>Filters</span>
      </nav>
    </div>

    <h1 class="text-h6 mb-3">Filter configuration</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Changes apply immediately to Item Search. Done returns to the catalog.
    </p>

    <v-row class="align-center mb-0">
      <v-col class="filter-col d-flex pa-1 align-center ga-1" cols="12" sm="6">
        <v-select
          v-model="activeCharacterProfileId"
          :items="characterProfileSelectItems"
          label="Character profile"
          density="compact"
          clearable
          hide-details
          class="flex-grow-1"
          @update:model-value="applyCharacterProfile"
        ></v-select>
        <v-btn
          icon
          variant="tonal"
          density="compact"
          aria-label="Edit character profiles"
          @click="openCharactersManager"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </v-col>

      <v-col class="filter-col d-flex pa-1 align-center ga-1" cols="12" sm="6">
        <v-select
          v-model="activeWeightConfigId"
          :items="weightConfigSelectItems"
          label="Weighted search"
          density="compact"
          clearable
          hide-details
          class="flex-grow-1"
          @update:model-value="onWeightConfigSelected"
        ></v-select>
        <v-btn
          icon
          variant="tonal"
          density="compact"
          aria-label="Edit weight configurations"
          @click="openWeightsManager"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" sm="6">
        <v-text-field
          v-model.number="levelMin"
          type="number"
          min="0"
          :max="LEVEL_MAX"
          step="1"
          label="Level min"
          density="compact"
          hide-details
        ></v-text-field>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" sm="6">
        <v-text-field
          v-model.number="levelMax"
          type="number"
          min="0"
          :max="LEVEL_MAX"
          step="1"
          label="Level max"
          density="compact"
          hide-details
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row class="align-center mb-0">
      <v-col class="filter-col d-flex pa-1" cols="6" sm="6" md="3">
        <v-select
          v-model="charAlignment"
          :items="charAlignments"
          label="Alignment"
          density="compact"
          clearable
          hide-details
          :disabled="characterFiltersLocked"
        ></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" sm="6" md="3">
        <v-select
          v-model="charRace"
          :items="charRaces"
          label="Race"
          density="compact"
          clearable
          hide-details
          :disabled="characterFiltersLocked"
        ></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" sm="6" md="3">
        <v-select
          v-model="charClass"
          :items="charClasses"
          label="Class"
          density="compact"
          clearable
          hide-details
          :disabled="characterFiltersLocked"
        ></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" sm="6" md="3">
        <v-select
          v-model="charGender"
          :items="charGenders"
          label="Gender"
          density="compact"
          clearable
          hide-details
          :disabled="characterFiltersLocked"
        ></v-select>
      </v-col>
    </v-row>

    <v-row class="align-center mb-0">
      <v-col class="filter-col d-flex pa-1" cols="6" md="4">
        <v-select v-model="itemType" :items="itemTypes" label="Item Type" density="compact" clearable hide-details></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" md="4">
        <v-select v-model="itemClass" :items="itemClasses" label="Item Class" density="compact" clearable hide-details></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" md="4">
        <v-autocomplete v-model="itemAffect" :items="itemAffects" label="Item Affect" density="compact" clearable hide-details></v-autocomplete>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" md="4">
        <v-select v-model="itemSlot" :items="itemSlots" label="Wear Location" density="compact" clearable hide-details></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" md="4">
        <v-select v-model="itemLayer" :items="itemLayers" label="Layer" density="compact" clearable hide-details></v-select>
      </v-col>

      <v-col class="filter-col d-flex pa-1" cols="6" md="4">
        <v-autocomplete
          :model-value="itemPropertyDisplay"
          :items="itemPropertyItems"
          label="Item Property"
          density="compact"
          :clearable="!activeWeightConfig"
          hide-details
          :disabled="!!activeWeightConfig"
          @update:model-value="onItemPropertyUpdate"
        ></v-autocomplete>
      </v-col>
    </v-row>

    <div class="d-flex flex-wrap ga-2 mt-4">
      <v-spacer></v-spacer>
      <v-btn variant="text" @click="goBack">Cancel</v-btn>
      <v-btn color="primary" variant="elevated" @click="goBack">Done</v-btn>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogFilters } from '../composables/useCatalogFilters'
import { LEVEL_MAX } from '../presets/constants'
import { useCatalogStore } from '../store'

const store = useCatalogStore()
const router = useRouter()
const route = useRoute()

const {
  levelMin,
  levelMax,
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
  characterFiltersLocked,
  activeWeightConfigId,
  activeCharacterProfileId,
  activeWeightConfig,
  weightConfigSelectItems,
  characterProfileSelectItems,
  ensureFilterSync,
  applyCharacterProfile,
  onWeightConfigSelected,
  onItemPropertyUpdate,
  openWeightsManager,
  openCharactersManager,
} = useCatalogFilters()

const itemTypes = computed(() => store.itemTypes ?? [])
const itemClasses = computed(() => store.itemClasses ?? [])
const itemAffects = computed(() => store.itemAffects ?? [])
const itemProperties = computed(() => store.itemProperties ?? [])

const itemPropertyDisplay = computed(() =>
  activeWeightConfig.value ? 'weighted' : itemProperty.value,
)
const itemPropertyItems = computed(() =>
  activeWeightConfig.value ? ['weighted'] : itemProperties.value,
)

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

const itemSlots = [
  'arms', 'body', 'feet', 'finger', 'hands', 'head', 'left_hand', 'legs',
  'float_nearby', 'neck', 'right_hand', 'waist', 'wrist',
]

const itemLayers = ['bottom', 'under', 'base', 'over', 'top']

const goBack = () => {
  router.push({ name: 'catalog', query: route.query })
}

onMounted(() => {
  ensureFilterSync()
  if (!store.catalog) store.fetchCatalog()
})
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

@media (max-width: 449px) {
  .filter-col {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
}
</style>
