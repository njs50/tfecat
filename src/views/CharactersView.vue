<template>
  <v-container fluid class="content-shell px-6 px-sm-8 py-10" style="max-width: 900px;">
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <nav class="text-body-2" aria-label="Breadcrumb">
        <router-link :to="{ name: 'catalog', query: route.query }" class="crumb-link">
          Item Search
        </router-link>
        <span class="mx-1 text-medium-emphasis">›</span>
        <span>Character profiles</span>
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

    <h1 class="text-h6 mb-3">Character profiles</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Selecting a profile on search presets alignment, race, class, gender, level range (1 … level),
      and softcap stats. Saved profiles stay in this browser.
    </p>

    <CharacterProfilesDialog
      :profiles="characterProfiles"
      :alignments="charAlignments"
      :races="charRaces"
      :classes="charClasses"
      :genders="charGenders"
      :start-id="id ?? null"
      @save="onSave"
      @remove="deleteCharacterProfile"
      @close="goBack"
    />
  </v-container>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import CharacterProfilesDialog from '../components/CharacterProfilesDialog.vue'
import { catalogQueryToState } from '../composables/useCatalogQuery'
import { copyShareLink, useShareFeedback } from '../composables/useShareLink'
import { usePresets } from '../presets/usePresets'
import type { CharacterProfile } from '../presets/types'

const props = defineProps<{ id?: string }>()

const router = useRouter()
const route = useRoute()
const {
  characterProfiles,
  activeCharacterProfile,
  activeWeightConfig,
  activeCharacterProfileId,
  upsertCharacterProfile,
  deleteCharacterProfile,
} = usePresets()
const { shareCopied, flashCopied } = useShareFeedback()

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

const goBack = () => {
  router.push({ name: 'catalog', query: route.query })
}

const onSave = (profile: CharacterProfile) => {
  const saved = upsertCharacterProfile(profile)
  activeCharacterProfileId.value = saved.id
  if (props.id !== saved.id) {
    router.replace({
      name: 'characters',
      params: { id: saved.id },
      query: route.query,
    })
  }
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
