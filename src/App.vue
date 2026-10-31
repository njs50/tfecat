<template>
  <v-app id="tfecat">
    <v-app-bar :height="124" app class="app-bar">
      <v-container fluid class="header-shell px-4">
        <v-toolbar color="transparent" density="compact" class="brand-toolbar">
          <v-btn :href="catalogHref" aria-label="TFEcat item catalog home" class="brand-link text-none px-0" variant="text" :ripple="false">
            <BrandMark class="brand-mark mr-3" />
            <span class="brand-wordmark" aria-hidden="true"><span class="brand-wordmark__tfe">TFE</span><span class="brand-wordmark__cat">cat</span></span>
          </v-btn>
          <v-spacer></v-spacer>
          <v-dialog max-width="600" v-model="isInstallModalVisible">
            <template #activator="{ props }">
              <v-btn class="install-button" color="primary" variant="elevated" prepend-icon="mdi-console-line" v-bind="props">Install CLI</v-btn>
            </template>
            <v-card class="modal-card">
              <v-card-title class="modal-title d-flex align-center"><v-icon class="mr-3" color="primary">mdi-package-variant</v-icon><span>Install the tfecat mudlet package</span></v-card-title>
              <v-card-text class="modal-content pa-4">
                <div class="mb-4"><p class="text-body-large mb-3">To install the tfecat package for the first time, copy and paste the following command into your Mudlet input bar:</p></div>
                <v-textarea ref="installInput" readonly v-model="installCode" variant="outlined" density="compact" bg-color="grey-darken-4" class="font-mono" hide-details rows="3" auto-grow></v-textarea>
                <div class="mt-3 text-body-small text-grey-lighten-1"><v-icon size="small" class="mr-1">mdi-lightbulb</v-icon>Click the copy button to copy the command to your clipboard</div>
              </v-card-text>
              <v-divider></v-divider>
              <v-card-actions class="modal-actions pa-4">
                <v-spacer></v-spacer>
                <v-btn color="secondary" variant="outlined" prepend-icon="mdi-content-copy" @click="copyInstall">Copy</v-btn>
                <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="isInstallModalVisible = false">Got it!</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-toolbar>
        <v-tabs color="primary" density="compact" height="44" model-value="catalog" class="primary-nav">
          <v-tab :href="catalogHref" value="catalog">Item catalog</v-tab>
          <v-tab value="trainers" disabled>Trainers</v-tab>
          <v-tab value="audit" disabled>Item audit</v-tab>
        </v-tabs>
      </v-container>
    </v-app-bar>

    <v-main>
      <v-container fluid class="content-shell px-4 px-sm-8 py-8 py-sm-10">
        <v-sheet color="transparent" class="page-heading mb-8">
          <div class="page-eyebrow">The Forest&apos;s Edge</div>
          <div class="page-title">Item catalog</div>
        </v-sheet>

        <v-expansion-panels class="filter-panel">
          <v-expansion-panel>
            <v-expansion-panel-title>Filter Items</v-expansion-panel-title>
            <v-expansion-panel-text class="pa-1">
              <v-row class="align-center mb-0">
                <v-col class="d-flex pa-1" cols="12">
                  <v-range-slider
                    v-model="levelRange"
                    min="0"
                    max="90"
                    step="1"
                    thumb-label="always"
                    label="Item Level Range"
                    hide-details
                    density="compact"
                  ></v-range-slider>
                </v-col>
              </v-row>

              <v-row class="align-center mb-0">
                <v-col class="filter-col d-flex pa-1" cols="6" md="3">
                  <v-select v-model="charAlignment" :items="charAlignments" label="Alignment" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="filter-col d-flex pa-1" cols="6" md="3">
                  <v-select v-model="charRace" :items="charRaces" label="Race" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="filter-col d-flex pa-1" cols="6" md="3">
                  <v-select v-model="charClass" :items="charClasses" label="Class" density="compact" clearable hide-details></v-select>
                </v-col>

                <v-col class="filter-col d-flex pa-1" cols="6" md="3">
                  <v-select v-model="charGender" :items="charGenders" label="Gender" density="compact" clearable hide-details></v-select>
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
                  <v-autocomplete v-model="itemProperty" :items="itemProperties" label="Item Property" density="compact" clearable hide-details></v-autocomplete>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-card class="catalog-card mt-4" elevation="0">
          <v-card-title class="catalog-toolbar pa-3">
            <v-text-field
              v-model="searchText"
              append-inner-icon="mdi-magnify"
              label="Search items"
              single-line
              hide-details
              clearable
              density="compact"
              variant="outlined"
              class="search-field"
            ></v-text-field>
          </v-card-title>
          <v-divider></v-divider>
          <v-data-table
            :headers="headers"
            :items="catalog"
            :items-per-page-options="itemsPerPageOptions"
            v-model:sort-by="sortBy"
            class="catalog-table"
            hover
          >
            <template #item="{ item, index }">
              <tr
                @click="rowClicked(item)"
                :class="['catalog-row', { 'catalog-row--alternate': index % 2 === 0 }]"
              >
                <td
                  v-for="header in headers"
                  :key="header.key"
                  :style="{
                    'text-align': header.align || 'start',
                    ...(header.width ? { width: header.width, maxWidth: header.width, whiteSpace: 'nowrap' } : {}),
                  }"
                >
                  <template v-if="header.key === 'Weight'">
                    <span v-if="item.Weight">{{ item.Weight.toFixed(2) }} lbs</span>
                  </template>
                  <template v-else-if="header.key === 'propertyAmount'">
                    <span v-if="item.propertyAmount != null">{{ item.propertyAmount }}</span>
                  </template>
                  <template v-else-if="header.key === 'damageOrAc'">
                    <span v-if="item.averageDamage">{{ item.averageDamage.toFixed(1) }} Av.D</span>
                    <span v-else-if="item['Armor Class'] != null && item['Armor Class'] !== ''">{{ item['Armor Class'] }} AC</span>
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

        <v-dialog
          v-model="showSelectedItem"
          :fullscreen="!mdAndUp"
          :max-width="mdAndUp ? '80vw' : undefined"
          :max-height="mdAndUp ? '90vh' : undefined"
        >
          <v-card class="modal-card" :style="mdAndUp ? 'max-height: 90vh;' : undefined">
            <v-card-title class="d-flex justify-space-between align-center pb-1 modal-title">
              <span style="text-transform: capitalize; font-size: 1.2rem; font-weight: 500;">{{ selectedItem?.name }}</span>
              <v-btn icon variant="text" @click.stop="showSelectedItem = false">
                <v-icon color="grey-darken-1">mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="mt-2 modal-content pa-4" style="border-radius: 8px;">
              <pre class="item-ident-pre">{{ selectedItemDisplayBuffer }}</pre>
              <!-- <pre>{{ selectedItem  ? JSON.stringify(selectedItem, null, 2) : '' }}</pre> -->
              <div v-if="selectedItem && selectedItem.custom && Object.keys(selectedItem.custom).length > 0" class="mt-4">
                        
                <div v-for="(custom, roomKey) in selectedItem.custom" :key="roomKey" class="mb-3">
                  <div class="text-subtitle-1 mb-1" style="color: #888;">Custom in Room #{{ roomKey }}:</div>
                  <pre style="margin: 0; color: #e0e0e0; font-size: 0.9rem; white-space: pre; overflow-x: auto; background: #2a2a2a; padding: 8px; border-radius: 4px;">Item                        Price  Weight  Lvl  Ingredients
----                        -----  ------  ---  -----------
{{ custom.raw }}</pre>
                </div>
              </div>

            </v-card-text>

          </v-card>
        </v-dialog>
      </v-container>
    </v-main>

    <div
      v-if="previewWatermark"
      class="preview-watermark"
      aria-hidden="true"
    >{{ previewWatermark }}</div>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { getItemPropertyAmount } from './itemProperties'
import { useCatalogStore } from './store'
import BrandMark from './components/BrandMark.vue'

const store = useCatalogStore()
const { mdAndUp } = useDisplay()
const catalogHref = import.meta.env.BASE_URL

/** Branch + short SHA; only when preview-deploy sets VITE_PREVIEW_*. */
const previewWatermark = computed(() => {
  const refName = import.meta.env.VITE_PREVIEW_REF
  const sha = import.meta.env.VITE_PREVIEW_SHA
  if (!refName || !sha) return ''
  return `${refName} · ${String(sha).slice(0, 7)}`
})

// Reactive data
const isInstallModalVisible = ref(false)
const installCode = ref(`lua postPMInstall='tfecat'; uninstallPackage('njs50-package-manager'); installPackage('https://raw.githubusercontent.com/njs50/njs50-package-manager/main/njs50-package-manager.xml')`)
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

/** Level first; below md hide Wear Loc./Layer; drop Weight or merged combat col depending on property filter. */
const headers = computed(() => {
  const cols: { title: string; key: string; align: 'start' | 'end'; width?: string }[] = [
    { title: 'Level', key: 'Level', align: 'end', width: '4.5rem' },
    { title: 'Item', key: 'name', align: 'start' },
  ]

  if (mdAndUp.value) {
    cols.push(
      { title: 'Wear Loc.', key: 'Wear Loc.', align: 'start' },
      { title: 'Layer', key: 'Layer', align: 'start' },
    )
  }

  // Swap Weight for the selected item property so the table can sort by its amount.
  // Below md: omit Weight entirely; keep the property column when a property is selected.
  if (itemProperty.value) {
    cols.push({
      title: String(itemProperty.value),
      key: 'propertyAmount',
      align: 'end',
    })
  } else if (mdAndUp.value) {
    cols.push({ title: 'Weight', key: 'Weight', align: 'end' })
  }

  // Below md with a property selected, drop merged damage/AC to free space.
  if (mdAndUp.value || !itemProperty.value) {
    let damageOrAcTitle = ''
    if (itemType.value === 'armor') {
      damageOrAcTitle = 'Armor Class'
    } else if (itemType.value === 'weapon') {
      damageOrAcTitle = 'Av. Damage'
    }
    cols.push({ title: damageOrAcTitle, key: 'damageOrAc', align: 'end' })
  }
  return cols
})

const itemsPerPageOptions = [5, 10, 15, 20, 25, 30, -1]

/** Stable sort-by so filter re-renders do not reset column sort. */
const sortBy = ref([{ key: 'datetime', order: 'desc' as const }])

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
  const itemTypes = store.itemTypes
  if (!itemTypes) {
    return []
  }
  return itemTypes
})

const itemClasses = computed(() => {
  const itemClasses = store.itemClasses
  if (!itemClasses) {
    return []
  }
  return itemClasses
})

const itemAffects = computed(() => {
  const itemAffects = store.itemAffects
  if (!itemAffects) {
    return []
  }
  return itemAffects
})

const itemProperties = computed(() => {
  const itemProperties = store.itemProperties
  if (!itemProperties) {
    return []
  }
  return itemProperties
})

const catalog = computed<any[]>(() => {
  const catalog = store.catalog

  if (!catalog) {
    return []
  }

  const filtered = catalog.filter((item: any) => {
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
      if (getItemPropertyAmount(item, itemProperty.value) === null) {
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

  // Attach sortable damage/AC merge value, and property amount when Weight is swapped.
  return filtered.map((item: any) => {
    return {
      ...item,
      propertyAmount: itemProperty.value
        ? getItemPropertyAmount(item, itemProperty.value)
        : null,
      damageOrAc: item.averageDamage ?? item['Armor Class'] ?? null,
    }
  })
})

/** Allowed values for a restriction map; null if unrestricted (all true). */
const allowedRestrictionValues = (map: Record<string, boolean> | undefined): string[] | null => {
  if (!map) {
    return null
  }
  const entries = Object.entries(map)
  if (!entries.length) {
    return null
  }
  const allowed = entries.filter(([, ok]) => ok).map(([key]) => key)
  if (allowed.length === entries.length) {
    return null
  }
  return allowed
}

/** Match raw-ident field colon column (`         Layer: …` → colon at index 14). */
const IDENT_COLON_COLUMN = 14

const formatRequirementLine = (label: string, values: string[]): string =>
  `${label.padStart(IDENT_COLON_COLUMN)}: ${values.join(', ')}`

const ALIGNMENT_CODES: Record<string, string> = {
  'Lawful Good': 'LG',
  'Lawful Neutral': 'LN',
  'Lawful Evil': 'LE',
  'Neutral Good': 'NG',
  'True Neutral': 'PN',
  'Neutral Evil': 'NE',
  'Chaotic Good': 'CG',
  'Chaotic Neutral': 'CN',
  'Chaotic Evil': 'CE',
}

const buildRequiresBlock = (item: any): string | null => {
  const lines: string[] = []
  const gender = allowedRestrictionValues(item.charGenders)
  if (gender) {
    lines.push(formatRequirementLine('Gender', gender))
  }
  const race = allowedRestrictionValues(item.charRaces)
  if (race) {
    lines.push(formatRequirementLine('Race', race))
  }
  const klass = allowedRestrictionValues(item.charClasses)
  if (klass) {
    lines.push(formatRequirementLine('Class', klass))
  }
  const alignment = allowedRestrictionValues(item.charAlignments)
  if (alignment) {
    lines.push(formatRequirementLine(
      'Alignment',
      alignment.map((name) => ALIGNMENT_CODES[name] ?? name),
    ))
  }
  if (!lines.length) {
    return null
  }
  return lines.join('\n')
}

/** Raw ident with Anti-Flags replaced by a Requires block from parsed maps. */
const formatItemDisplayBuffer = (item: any): string => {
  const buffer: string = item?.buffer ?? ''
  const requires = buildRequiresBlock(item)
  const antiFlagsLine = /^[ \t]*Anti-Flags:.*$/m

  if (!requires) {
    return buffer
  }
  if (antiFlagsLine.test(buffer)) {
    return buffer.replace(antiFlagsLine, requires)
  }
  if (/^[ \t]*Restrictions:.*$/m.test(buffer)) {
    return buffer.replace(/^[ \t]*Restrictions:.*$/m, (line) => `${requires}\n\n${line}`)
  }
  return `${buffer.replace(/\s*$/, '')}\n\n${requires}\n`
}

const selectedItemDisplayBuffer = computed(() => {
  if (!selectedItem.value) {
    return ''
  }
  return formatItemDisplayBuffer(selectedItem.value)
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
  store.fetchCatalog()
})
</script>

<style scoped>
.app-bar {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface)) !important;
}

.header-shell,
.content-shell {
  max-width: 1280px;
}

.header-shell {
  height: 100%;
}

.brand-toolbar {
  height: 80px;
}

.brand-link {
  min-width: 0;
}

.brand-mark {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
}

.brand-wordmark {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: -0.08em;
  line-height: 1;
}

.brand-wordmark__tfe {
  color: rgb(var(--v-theme-on-surface));
}

.brand-wordmark__cat {
  color: rgb(var(--v-theme-primary));
}

.install-button {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.primary-nav :deep(.v-tab) {
  min-width: 0;
  padding-inline: 0;
  margin-right: 32px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
}

.primary-nav :deep(.v-tab--disabled) {
  opacity: 0.46;
}

.page-eyebrow {
  color: rgb(var(--v-theme-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.page-title {
  margin-top: 8px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.filter-panel :deep(.v-expansion-panel) {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
  box-shadow: none;
}

.filter-panel :deep(.v-expansion-panel-title) {
  min-height: 52px;
  font-weight: 500;
}

.catalog-card {
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));
}

.catalog-toolbar {
  display: flex;
  justify-content: flex-end;
  background: rgb(var(--v-theme-surface));
}

.search-field {
  max-width: 360px;
}

.catalog-table :deep(thead th) {
  height: 52px;
  border-bottom-color: rgb(var(--v-theme-surface-variant)) !important;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.catalog-row {
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  transition: background-color 120ms ease;
}

.catalog-row--alternate {
  background: rgb(var(--v-theme-background));
}

.catalog-row:hover {
  background: rgba(var(--v-theme-primary), 0.09) !important;
}

.catalog-row td {
  height: 56px !important;
  border-bottom-color: rgb(var(--v-theme-surface-variant)) !important;
  color: rgb(var(--v-theme-on-surface));
}

.catalog-table :deep(.v-data-table-footer) {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-secondary));
}

@media (max-width: 599px) {
  .search-field {
    max-width: none;
  }

  .catalog-toolbar {
    display: block;
  }

  .page-title {
    font-size: 1.75rem;
  }
}

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


.item-ident-pre {
  margin: 0;
  color: #e0e0e0;
  font-size: 0.875rem; /* match body text scale */
  white-space: pre;
  overflow-x: auto;
  flex: 1;
  min-height: 0;
}

/* 2-across from ~450px; 1-across only below (skip Vuetify sm ~600). */
@media (max-width: 449px) {
  .filter-col {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
}

.preview-watermark {
  position: fixed;
  left: 8px;
  bottom: 6px;
  z-index: 9999;
  pointer-events: none;
  font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: rgba(255, 255, 255, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
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
