<template>
  <v-app id="tfecat">
    <v-app-bar :clipped-left="true" app>
      <v-icon color="white">mdi-cat</v-icon>
      <v-toolbar-title>TFE Items</v-toolbar-title>
      <v-spacer></v-spacer>

      <v-dialog
        max-width="900"
        v-model="isInstallModalVisible"
      >
        <template #activator="{ props }">
          <v-btn 
            color="primary" 
            variant="elevated"
            v-bind="props"
          >
            Install
          </v-btn>
        </template>

        <v-card>
          <v-card-title>
            Installing mudlet package:
          </v-card-title>

          <v-card-text>
            To install the tfecat mudlet package for the first time copy and paste the following into your mudlet input bar:
            <v-text-field
              ref="installInput"
              append-icon="mdi-content-copy"
              readonly
              @click:append="copyInstall"
              v-model='installCode'
            ></v-text-field>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="elevated"
              @click="isInstallModalVisible = false"
            >
              Done
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>Filter Items</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row align="center">
                <v-col class="d-flex" cols="12">
                  <v-range-slider
                    v-model="levelRange"
                    min="0"
                    max="90"
                    thumb-label="always"
                    label="Item Level Range"
                    hide-details
                  ></v-range-slider>
                </v-col>
              </v-row>

              <v-row align="center">
                <v-col class="d-flex" cols="3">
                  <v-select v-model="charAlignment" :items="charAlignments" label="Alignment" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="3">
                  <v-select v-model="charRace" :items="charRaces" label="Race" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="3">
                  <v-select v-model="charClass" :items="charClasses" label="Class" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="3">
                  <v-select v-model="charGender" :items="charGenders" label="Gender" density="compact" clearable></v-select>
                </v-col>
              </v-row>

              <v-row align="center">
                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemType" :items="itemTypes" label="Item Type" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemClass" :items="itemClasses" label="Item Class" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-autocomplete v-model="itemAffect" :items="itemAffects" label="Item Affect" density="compact" clearable></v-autocomplete>
                </v-col>
              </v-row>

              <v-row align="center">
                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemSlot" :items="itemSlots" label="Wear Location" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemLayer" :items="itemLayers" label="Layer" density="compact" clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-autocomplete v-model="itemProperty" :items="itemProperties" label="Item Property" density="compact" clearable></v-autocomplete>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-card>
          <v-card-title>
            <v-spacer></v-spacer>
            <v-text-field
                v-model="searchText"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
                clearable
            ></v-text-field>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="catalog"
            :footer-props="footerProps"
          >
            <template #item="{ item }">
              <tr @click="rowClicked(item)" style="cursor:pointer">
                <td v-for="header in headers" :key="header.key">
                  {{ item[header.key] }}
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card>

        <v-dialog v-model="showSelectedItem" max-width="1100" persistent>
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <span style="text-transform: capitalize;">{{ selectedItem?.name }}</span>
              <v-btn icon @click.stop="showSelectedItem = false">
                <v-icon color="grey">mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-subtitle v-if="selectedItem && selectedItem['Unidentified Name'] && selectedItem['Unidentified Name'].toLowerCase() != selectedItem.name.toLowerCase()" style="text-transform: capitalize;">
              {{ selectedItem["Unidentified Name"] }}
            </v-card-subtitle>
            <v-card-text>
              <pre>{{ selectedItem ? selectedItem.buffer : '' }}</pre>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

// Reactive data
const isInstallModalVisible = ref(false)
const installCode = ref(`lua postPMInstall='tfecat'; uninstallPackage('njs50-package-manager'); installPackage('https://tinyurl.com/ykjbnsf8/njs50-package-manager.xml')`)
const searchText = ref("")
const levelRange = ref([0, 90])
const charAlignment = ref<string | null>(null)
const charClass = ref<string | null>(null)
const charRace = ref<string | null>(null)
const charGender = ref<string | null>(null)
const itemType = ref(null)
const itemClass = ref(null)
const itemAffect = ref(null)
const itemProperty = ref(null)
const itemSlot = ref(null)
const itemLayer = ref(null)
const selectedItem = ref<any>(null)
const showSelectedItem = ref(false)

const headers = ref([
  {
    title: 'Item',
    align: 'start' as const,
    key: 'name',
  },
  { title: 'Wear Loc.', key: 'Wear Loc.', align: 'start' as const },
  { title: 'Layer', key: 'Layer', align: 'start' as const },
  { title: 'Level', key: 'Level', align: 'end' as const },
  { title: 'Weight', key: 'Weight', align: 'end' as const },
  { title: 'Av. Damage', key: 'averageDamage', align: 'end' as const},
  { title: 'Armor Class', key: 'Armor Class', align: 'end' as const },
])

const footerProps = ref({
  "items-per-page-options": [5,10,15,20,25,30,-1]
})

const itemSlots = ref([
  "arms",
  "body",
  "feet",
  "finger",
  "hands",
  "head",
  "left_hand",
  "legs",
  "float_nearby",
  "neck",
  "right_hand",
  "waist",
  "wrist",
])

const itemLayers = ref([ 'bottom', 'under', 'base', 'over', 'top' ])

const charClasses = ref([
  "Bard",
  "Bulwark",
  "Cleric",
  "Druid",
  "Harbinger",
  "Legate",
  "Mage",
  "Monk",
  "Paladin",
  "Ranger",
  "Reaver",
  "Thief",
  "Warrior"
].sort())

const charRaces = ref([
  "Ogre",
  "Troll",
  "Orc",
  "Vyan",
  "Goblin",
  "Human",
  "Lizardfolk",
  "Dwarf",
  "Halfling",
  "Gnome",
  "Ent",
  "Elf"
].sort())

const charAlignments = ref([
  "Lawful Good",
  "Lawful Neutral",
  "Lawful Evil",
  "Neutral Good",
  "True Neutral",
  "Neutral Evil",
  "Chaotic Good",
  "Chaotic Neutral",
  "Chaotic Evil"
].sort())

const charGenders = ref([
  "Female",
  "Male",
].sort())

// Computed properties
const itemTypes = computed(() => {
  const itemTypes = store.getters.ITEM_TYPES
  if (!itemTypes) {
    return []
  }
  return itemTypes
})

const itemClasses = computed(() => {
  const itemClasses = store.getters.ITEM_CLASSES
  if (!itemClasses) {
    return []
  }
  return itemClasses
})

const itemAffects = computed(() => {
  const itemAffects = store.getters.ITEM_AFFECTS
  if (!itemAffects) {
    return []
  }
  return itemAffects
})

const itemProperties = computed(() => {
  const itemProperties = store.getters.ITEM_PROPERTIES
  if (!itemProperties) {
    return []
  }
  return itemProperties
})

const catalog = computed(() => {
  const catalog = store.getters.CATALOG

  if (!catalog) {
    return []
  }

  return catalog.filter((item: any) => {
    // if search text is provided search on that first
    if (searchText.value) {
      if (
        item["Unidentified Name"]
          .toLowerCase()
          .indexOf(searchText.value.toLowerCase()) === -1 &&
        item.buffer
          .toLowerCase()
          .indexOf(searchText.value.toLowerCase()) === -1 && // remove this buffer search when we can search attributes etc
        item.name
          .toLowerCase()
          .indexOf(searchText.value.toLowerCase()) === -1
      ) {
        return false
      }
    }

    if (itemType.value) {
      if (item.itemType !== itemType.value) {
        return false
      }
    }
    if (itemClass.value) {
      if (!item.Class || item.Class !== itemClass.value) {
        return false
      }
    }
    if (itemAffect.value) {
      if (!item.affects || !item.affects.find((aff: any) => aff.name === itemAffect.value)) {
        return false
      }
    }
    if (itemProperty.value) {
      if (!item.affects || !item.affects.find((aff: any) => aff.name === itemProperty.value)) {
        return false
      }
    }

    // item wear location / layer
    if (itemSlot.value) {
      if (!item["Wear Loc."] || item["Wear Loc."].indexOf(itemSlot.value) < 0) {
        return false
      }
    }
    if (itemLayer.value) {
      if (!item.Layer || item.Layer.indexOf(itemLayer.value) < 0) {
        return false
      }
    }

    if (charAlignment.value && !item.charAlignments[charAlignment.value]) {
      return false
    }

    if (charRace.value && !item.charRaces[charRace.value.toLowerCase()]) {
      return false
    }

    if (charClass.value && !item.charClasses[charClass.value.toLowerCase()]) {
      return false
    }

    if (charGender.value && !item.charGenders[charGender.value.toLowerCase()]) {
      return false
    }

    // filter on level range
    if (
      item.Level < levelRange.value[0] ||
      item.Level > levelRange.value[1]
    ) {
      return false
    }

    return true
  })
})

// Methods
const rowClicked = (row: any) => {
  selectedItem.value = row
  showSelectedItem.value = true
  console.info('item selected', row)
}

const copyInstall = () => {
  const input = document.querySelector('input[readonly]') as HTMLInputElement
  if (input) {
    input.focus()
    input.select()
    document.execCommand('copy')
  }
}

// Lifecycle
onMounted(() => {
  store.dispatch("GET_CATALOG")
})
</script>

<style>
/* Ensure icons are visible in dark theme */
.v-icon {
  color: inherit;
}

/* Ensure icons in app bar are visible */
.v-app-bar .v-icon {
  color: white !important;
}

/* Ensure icons in buttons are visible */
.v-btn .v-icon {
  color: inherit;
}

/* Ensure icons in text fields are visible */
.v-text-field .v-icon {
  color: rgba(255, 255, 255, 0.7) !important; 
}
</style>
