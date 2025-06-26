<template>
  <v-app id="tfecat">
    <v-app-bar :clipped-left="true" app class="px-2">
      <v-icon color="white">mdi-cat</v-icon>
      <v-toolbar-title>TFE Items</v-toolbar-title>
      <v-spacer></v-spacer>

      <v-dialog
        max-width="600"
        v-model="isInstallModalVisible"
      >
        <template #activator="{ props }">
          <v-btn 
            color="primary" 
            variant="elevated"
            prepend-icon="mdi-download"
            v-bind="props"
          >
            Install
          </v-btn>
        </template>

        <v-card class="modal-card">
          <v-card-title class="modal-title d-flex align-center">
            <v-icon class="mr-3" color="primary">mdi-package-variant</v-icon>
            <span>Install the tfecat mudlet package</span>
          </v-card-title>

          <v-card-text class="modal-content pa-4">
            <div class="mb-4">
              <p class="text-body-1 mb-3">
                To install the tfecat package for the first time, copy and paste the following command into your Mudlet input bar:
              </p>

            </div>

            <v-textarea
              ref="installInput"
              readonly
              v-model='installCode'
              variant="outlined"
              density="compact"
              bg-color="grey-darken-4"
              class="font-mono"
              hide-details
              rows="3"
              auto-grow
            ></v-textarea>

            <div class="mt-3 text-caption text-grey-lighten-1">
              <v-icon size="small" class="mr-1">mdi-lightbulb</v-icon>
              Click the copy button to copy the command to your clipboard
            </div>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="modal-actions pa-4">
            <v-spacer></v-spacer>
            <v-btn
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-content-copy"
              @click="copyInstall"
            >
              Copy
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-check"
              @click="isInstallModalVisible = false"
            >
              Got it!
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-2">
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>Filter Items</v-expansion-panel-title>
            <v-expansion-panel-text class="pa-1">
              <v-row align="center" class="mb-0">
                <v-col class="d-flex pa-1" cols="12">
                  <v-range-slider
                    v-model="levelRange"
                    min="0"
                    max="90"
                    thumb-label="always"
                    label="Item Level Range"
                    hide-details
                    density="compact"
                  ></v-range-slider>
                </v-col>
              </v-row>

              <v-row align="center" class="mb-0">
                <v-col class="d-flex pa-1" cols="3">
                  <v-select v-model="charAlignment" :items="charAlignments" label="Alignment" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="3">
                  <v-select v-model="charRace" :items="charRaces" label="Race" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="3">
                  <v-select v-model="charClass" :items="charClasses" label="Class" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="3">
                  <v-select v-model="charGender" :items="charGenders" label="Gender" density="compact" clearable hide-details></v-select>
                </v-col>
              </v-row>

              <v-row align="center" class="mb-0">
                <v-col class="d-flex pa-1" cols="4">
                  <v-select v-model="itemType" :items="itemTypes" label="Item Type" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="4">
                  <v-select v-model="itemClass" :items="itemClasses" label="Item Class" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="4">
                  <v-autocomplete v-model="itemAffect" :items="itemAffects" label="Item Affect" density="compact" clearable hide-details></v-autocomplete>
                </v-col>
              </v-row>

              <v-row align="center" class="mb-0">
                <v-col class="d-flex pa-1" cols="4">
                  <v-select v-model="itemSlot" :items="itemSlots" label="Wear Location" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="4">
                  <v-select v-model="itemLayer" :items="itemLayers" label="Layer" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="d-flex pa-1" cols="4">
                  <v-autocomplete v-model="itemProperty" :items="itemProperties" label="Item Property" density="compact" clearable hide-details></v-autocomplete>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-card class="mt-2 elevation-2 rounded-lg">
          <v-card-title class="d-flex align-center py-1">
            <v-spacer></v-spacer>
            <v-text-field
              v-model="searchText"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
              clearable
              density="compact"
              class="ma-1"
              style="max-width: 400px;"
            ></v-text-field>
          </v-card-title>
          <v-divider></v-divider>
          <v-data-table
            :headers="headers"
            :items="catalog"
            :footer-props="footerProps"
            class="elevation-0"
            hover
          >
            <template #item="{ item, index }">
              <tr
                @click="rowClicked(item)"
                style="cursor:pointer;"
                :class="[index % 2 === 0 ? 'bg-grey-darken-4' : '', 'hover-row']"
              >
                <td v-for="header in headers" :key="header.key" :style="{ 'text-align': header.align || 'start' }">
                  <template v-if="header.key === 'Weight'">
                    <span v-if="item.Weight">{{ item.Weight.toFixed(2) }} lbs</span>
                  </template>
                  <template v-else-if="header.key === 'averageDamage'">
                    <span v-if="item.averageDamage">{{ item.averageDamage.toFixed(1) }}</span>
                  </template>
                  <template v-else-if="header.key === 'Wear Loc.'">
                    <span v-if="item['Wear Loc.']">{{ Array.isArray(item['Wear Loc.']) ? item['Wear Loc.'].join(', ') : item['Wear Loc.'] }}</span>
                  </template>
                  <template v-else-if="header.key === 'Layer'">
                    <span v-if="item.Layer">{{ Array.isArray(item.Layer) ? item.Layer.join(', ') : item.Layer }}</span>
                  </template>
                  <template v-else>
                    {{ item[header.key] }}
                  </template>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card>

        <v-dialog v-model="showSelectedItem" max-width="80vw" max-height="80vh">
          <v-card class="modal-card" style="max-height: 80vh;">
            <v-card-title class="d-flex justify-space-between align-center pb-2 modal-title">
              <span style="text-transform: capitalize; font-size: 1.4rem; font-weight: 500;">{{ selectedItem?.name }}</span>
              <v-btn icon variant="text" @click.stop="showSelectedItem = false">
                <v-icon color="grey-darken-1">mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-subtitle v-if="selectedItem && selectedItem['Unidentified Name'] && selectedItem['Unidentified Name'].toLowerCase() != selectedItem.name.toLowerCase()" class="modal-subtitle" style="text-transform: capitalize; font-size: 1.1rem; color: #888;">
              {{ selectedItem["Unidentified Name"] }}
            </v-card-subtitle>
            <v-card-text class="mt-2 modal-content pa-4" style="border-radius: 8px; max-height: calc(80vh - 200px); overflow: auto;">
              <pre style="margin: 0; color: #e0e0e0; font-size: 1rem; white-space: pre; overflow-x: auto;">{{ selectedItem ? selectedItem.buffer : '' }}</pre>
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
const rowClicked = (item: any) => {
  selectedItem.value = item
  showSelectedItem.value = true
  console.info('item selected', item)
}

const copyInstall = () => {
  const textarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement
  if (textarea) {
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
  }
}

// Lifecycle
onMounted(() => {
  store.dispatch("GET_CATALOG")
})
</script>

<style scoped>
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

.hover-row:hover {
  background: #333 !important;
}
.bg-grey-darken-4 {
  background: #232323 !important;
}
</style>

<style>
/* Modal contrast improvements - high specificity classes */
.modal-card {
  border: 2px solid #424242 !important;
  background: #1e1e1e !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8) !important;
}

.modal-title {
  background: #2d2d2d !important;
  border-bottom: 1px solid #424242 !important;
}

.modal-subtitle {
  background: #262626 !important;
  border-bottom: 1px solid #424242 !important;
}

.modal-content {
  background: #1e1e1e !important;
}

.modal-actions {
  background: #2d2d2d !important;
  border-top: 1px solid #424242 !important;
}

/* Overlay background for better contrast */
.v-dialog .v-overlay__scrim {
  background: rgba(0, 0, 0, 0.7) !important;
}

/* Additional specificity for modal components */
.v-dialog .v-card.v-card {
  border: 2px solid #424242 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8) !important;
  background: #1e1e1e !important;
}

.v-dialog .v-card .v-card-title {
  background: #2d2d2d !important;
  border-bottom: 1px solid #424242 !important;
}

.v-dialog .v-card .v-card-subtitle {
  background: #262626 !important;
  border-bottom: 1px solid #424242 !important;
}

.v-dialog .v-card .v-card-text {
  background: #1e1e1e !important;
}

.v-dialog .v-card .v-card-actions {
  background: #2d2d2d !important;
  border-top: 1px solid #424242 !important;
}
</style>
