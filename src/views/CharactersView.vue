<template>
  <v-container fluid class="pa-2" style="max-width: 680px;">
    <v-btn
      class="mb-2"
      variant="tonal"
      density="compact"
      prepend-icon="mdi-arrow-left"
      @click="goBack"
    >
      Back to search
    </v-btn>
    <CharacterProfilesDialog
      :profiles="characterProfiles"
      :alignments="charAlignments"
      :races="charRaces"
      :classes="charClasses"
      :genders="charGenders"
      :start-id="id ?? null"
      @save="upsertCharacterProfile"
      @remove="deleteCharacterProfile"
      @close="goBack"
    />
  </v-container>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import CharacterProfilesDialog from '../components/CharacterProfilesDialog.vue'
import { usePresets } from '../presets/usePresets'

defineProps<{ id?: string }>()

const router = useRouter()
const route = useRoute()
const {
  characterProfiles,
  upsertCharacterProfile,
  deleteCharacterProfile,
} = usePresets()

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
</script>
