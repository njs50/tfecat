

<template>

  <v-app id="tfecat">

    <v-app-bar :clipped-left="true" app>
      <v-icon>mdi-cat</v-icon>
      <v-toolbar-title>TFE Items</v-toolbar-title>
      <v-spacer></v-spacer>

      <v-dialog
        max-width="900"
        v-model="isInstallModalVisible"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn 
            color="primary" 
            dark
            v-bind="attrs"
            v-on="on"
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
              @click="isInstallModalVisible = false"
            >
              Done
            </v-btn>
          </v-card-actions>
        </v-card>

      </v-dialog>

      
      
    </v-app-bar>

    <v-content>

      <v-container fluid>

        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-header>Filter Items</v-expansion-panel-header>
            <v-expansion-panel-content>

              <v-row align="center">
                <v-col class="d-flex" cols="12">
                  <v-range-slider
                    v-model="levelRange"
                    min="0"
                    max="90"
                    thumb-label="always"
                    label="Item Level Range"
                    hide-details="true"
                  ></v-range-slider>
                </v-col>
              </v-row>

              <v-row align="center">
                <v-col class="d-flex" cols="3">
                  <v-select v-model="charAlignment" :items="charAlignments" label="Alignment" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="3">
                  <v-select v-model="charRace" :items="charRaces" label="Race" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="3">
                  <v-select v-model="charClass" :items="charClasses" label="Class" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="3">
                  <v-select v-model="charGender" :items="charGenders" label="Gender" dense clearable></v-select>
                </v-col>

              </v-row>

              <v-row align="center">

                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemType" :items="itemTypes" label="Item Type" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemClass" :items="itemClasses" label="Item Class" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-autocomplete v-model="itemAffect" :items="itemAffects" label="Item Affect" dense clearable></v-autocomplete>
                </v-col>

              </v-row>

              <v-row align="center">

                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemSlot" :items="itemSlots" label="Wear Location" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-select v-model="itemLayer" :items="itemLayers" label="Layer" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-autocomplete v-model="itemProperty" :items="itemProperties" label="Item Property" dense clearable></v-autocomplete>
                </v-col>

              </v-row>

            </v-expansion-panel-content>
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
    @click:row="rowClicked"
    :footer-props="footerProps"
  >
    <template v-slot:item.Weight="{ item }">
      <span v-if="item.Weight">{{item.Weight.toFixed(2)}} lbs</span>
    </template>

    <template v-slot:item.averageDamage="{ item }">
      <span v-if="item.averageDamage">{{item.averageDamage.toFixed(1)}}</span>
    </template>

  </v-data-table>
</v-card>



        <v-dialog
          v-model="showSelectedItem"
          max-width="900"
          v-if="selectedItem"
        >
          <v-card class="pa-5" width="auto">

             <v-btn icon @click.stop="showSelectedItem = false" class="float-right">
              <v-icon>mdi-close</v-icon>
            </v-btn>

            <v-card-title style="text-transform: capitalize;">
              {{selectedItem.name}}
            </v-card-title>

            <v-card-subtitle style="text-transform: capitalize;" v-if="selectedItem['Unidentified Name'].toLowerCase() != selectedItem.name.toLowerCase()">
              {{selectedItem["Unidentified Name"]}}
            </v-card-subtitle>

            <!-- <v-expansion-panels v-model="itemPanel">

              <v-expansion-panel>
                <v-expansion-panel-header>Item</v-expansion-panel-header>
                <v-expansion-panel-content>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </v-expansion-panel-content>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-header>Raw Identification</v-expansion-panel-header>
                <v-expansion-panel-content> -->
                <div class="d-inline-flex">
                  <pre>{{ selectedItem ? selectedItem.buffer : ''}}</pre>
                </div>
                <!-- </v-expansion-panel-content>
              </v-expansion-panel>

            </v-expansion-panels> -->


          </v-card>
        </v-dialog>

    
    



      </v-container>
    </v-content>




    <!-- <v-footer :inset="footer.inset" app>
      <span class="px-4">&copy; {{ new Date().getFullYear() }}</span>
    </v-footer> -->
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";


export default Vue.extend({
  name: "App",

  components: {
    
  },

  mounted() {
    this.$store.dispatch("GET_CATALOG");
  },

  computed: {

    itemTypes() {
      const itemTypes = this.$store.getters.ITEM_TYPES;
      if (!itemTypes) {
        return [];
      }
      return itemTypes;
    },


    itemClasses() {
      const itemClasses = this.$store.getters.ITEM_CLASSES;
      if (!itemClasses) {
        return [];
      }
      return itemClasses;
    },

    itemAffects() {
      const itemAffects = this.$store.getters.ITEM_AFFECTS;
      if (!itemAffects) {
        return [];
      }
      return itemAffects;
    },

    itemProperties() {
      const itemProperties = this.$store.getters.ITEM_PROPERTIES;
      if (!itemProperties) {
        return [];
      }
      return itemProperties;
    },

    catalog() {

      const catalog = this.$store.getters.CATALOG;

      if (!catalog) {
        return [];
      }

      return catalog.filter((item: any) => {
        // if search text is provided search on that first
        if (this.$data.searchText) {
          if (
            item["Unidentified Name"]
              .toLowerCase()
              .indexOf(this.$data.searchText.toLowerCase()) === -1 &&
            item.buffer
              .toLowerCase()
              .indexOf(this.$data.searchText.toLowerCase()) === -1 && // remove this buffer search when we can search attributes etc
            item.name
              .toLowerCase()
              .indexOf(this.$data.searchText.toLowerCase()) === -1
          ) {
            return false;
          }
        }

        if (this.$data.itemType) {
          if (item.itemType !== this.$data.itemType) {
            return false;
          }
        }
        if (this.$data.itemClass) {
          if (!item.Class || item.Class !== this.$data.itemClass) {
            return false;
          }
        }
        if (this.$data.itemAffect) {
          if (!item.affects || !item.affects.find((aff: any) => aff.name === this.$data.itemAffect)) {
            return false;
          }
        }
        if (this.$data.itemProperty) {
          if (!item.affects || !item.affects.find((aff: any) => aff.name === this.$data.itemProperty)) {
            return false;
          }
        }


        // item wear location / layer
        if (this.$data.itemSlot) {
          if (!item["Wear Loc."] || item["Wear Loc."].indexOf(this.$data.itemSlot) < 0) {
            return false;
          }
        }
        if (this.$data.itemLayer) {
          if (!item.Layer || item.Layer.indexOf(this.$data.itemLayer) < 0) {
            return false;
          }
        }

        if (this.$data.charAlignment && !item.charAlignments[this.$data.charAlignment]) {
          return false;
        }

        if (this.$data.charRace && !item.charRaces[this.$data.charRace.toLowerCase()]) {
          return false;
        }

        if (this.$data.charClass && !item.charClasses[this.$data.charClass.toLowerCase()]) {
          return false;
        }

        if (this.$data.charGender && !item.charGenders[this.$data.charGender.toLowerCase()]) {
          return false;
        }


        // filter on level range
        if (
          item.Level < this.$data.levelRange[0] ||
          item.Level > this.$data.levelRange[1]
        ) {
          return false;
        }

        return true;
      });
    }
  },

  data: () => ({

    isInstallModalVisible: false,
    installCode: `lua postPMInstall='tfecat'; uninstallPackage('njs50-package-manager'); installPackage('https://tinyurl.com/ykjbnsf8/njs50-package-manager.xml')`,

    searchText: "",

    levelRange: [0, 90],

    charAlignment: null,
    charClass: null,
    charRace: null,
    charGender: null,

    itemType: null,
    itemClass: null,
    itemAffect: null,
    itemProperty: null,

    itemSlot: null,
    itemLayer: null,

    selectedItem: null,

    showSelectedItem: false,
    itemPanel: 0,

    headers: [
      {
        text: 'Item',
        align: 'start',
        value: 'name',
      },
      { text: 'Wear Loc.', value: 'Wear Loc.', align: 'start' },
      { text: 'Layer', value: 'Layer', align: 'start' },
      { text: 'Level', value: 'Level', align: 'end' },
      { text: 'Weight', value: 'Weight', align: 'end' },
      // { text: '', value: 'Damage' },
      // { text: 'Damage', value: 'Damage', align: 'center'},
      { text: 'Av. Damage', value: 'averageDamage', align: 'end'},

      { text: 'Armor Class', value: 'Armor Class', align: 'end' },
      // { text: 'Global Armor', value: 'Global Armor', align: 'center' },
    ],

    footerProps: {
      "items-per-page-options": [5,10,15,20,25,30,-1]
    },

    itemSlots: [
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
    ],

    itemLayers: [ 'bottom', 'under', 'base', 'over', 'top' ],

    charClasses: [
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
    ].sort(),
    charRaces: [
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
    ].sort(),
    charAlignments: [
      "Lawful Good",
      "Lawful Neutral",
      "Lawful Evil",
      "Neutral Good",
      "True Neutral",
      "Neutral Evil",
      "Chaotic Good",
      "Chaotic Neutral",
      "Chaotic Evil"
    ].sort(),

    charGenders: [
      "Female",
      "Male",
    ].sort(),

    drawers: ["Default (no property)", "Permanent", "Temporary"],
    primaryDrawer: {
      model: null,
      type: "permanent",
      clipped: true,
      floating: false,
      mini: false
    },
    footer: {
      inset: false
    }
  }),

  methods: {
    rowClicked (item: any, row: any) {
      this.$data.selectedItem = item;
      this.$data.showSelectedItem = true;
      console.info('item selected', item)
    },
    showInstallModal() {
      this.isInstallModalVisible = true;
    },
    closeInstallModal() {
      this.isInstallModalVisible = false;
    },
    copyInstall() {
      const input = this.$refs.installInput as HTMLElement;
      input.focus();
      document.execCommand('selectAll');
      document.execCommand('copy');
    },
  }
});
</script>
