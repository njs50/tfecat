<template>

  <v-app id="sandbox">

    <v-navigation-drawer :clipped="true" :permanent="true" :temporary="false" app overflow>
      <v-text-field
        v-model="searchText"
        append-icon="mdi-magnify"
        placeholder="Search Items"
        solo
        hide-details="true"
        clearable
      ></v-text-field>

      <v-list-item
        v-for="(item, vnum) in catalog"
        :key="vnum"
        :disabled="selectedItem==item"
      >
        <v-list-item-content>
          <v-list-item-title v-on:click="selectedItem=item">{{item.name}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-navigation-drawer>

    <v-app-bar :clipped-left="true" app>
      <v-icon>mdi-cat</v-icon>
      <v-toolbar-title>TFE Items</v-toolbar-title>
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
                <v-col class="d-flex" cols="4">
                  <v-select v-model="charAlignment" :items="charAlignments" label="Alignment" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-select v-model="charRace" :items="charRaces" label="Race" dense clearable></v-select>
                </v-col>

                <v-col class="d-flex" cols="4">
                  <v-select v-model="charClass" :items="charClasses" label="Class" dense clearable></v-select>
                </v-col>
              </v-row>

            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-card v-if="selectedItem" class="pa-5">
          <pre>{{ selectedItem ? selectedItem.buffer : ''}}</pre>
        </v-card>

      </v-container>
    </v-content>

    <!-- <v-footer :inset="footer.inset" app>
      <span class="px-4">&copy; {{ new Date().getFullYear() }}</span>
    </v-footer> -->
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";
// import HelloWorld from './components/HelloWorld.vue';

export default Vue.extend({
  name: "App",

  components: {
    // HelloWorld,
  },

  mounted() {
    this.$store.dispatch("GET_CATALOG");
  },

  computed: {
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

        const checkAntiFlags = [];
        const checkRestrictions = [];

        if (this.$data.charAlignment) {
          // checkAntiFlags.push('anti-' + this.$data.charRace.toLowerCase())
          const parts = this.$data.charAlignment.split(' ');

          if ( parts[0] !== 'True') {
            checkAntiFlags.push('anti-' + parts[0].toLowerCase())
          }

          if ( parts[0] !== 'Neutral') {
            checkAntiFlags.push('anti-' + parts[1].toLowerCase())
          } else {
            checkAntiFlags.push('only-good-evil')
          }

        }


        if (this.$data.charRace) {
          checkAntiFlags.push('anti-' + this.$data.charRace.toLowerCase())
        }

        if (this.$data.charClass) {
          checkAntiFlags.push('anti-' + this.$data.charClass.toLowerCase())

          // clerics (and i think druids) can't use bladed weapons
          if (this.$data.charClass == 'Cleric' || this.$data.charClass == 'Druid') {
            if (item.Restrictions.indexOf('bladed') > -1) {
              return false;
            }
          }
          // paladins can't use dishonorable things
          if (this.$data.charClass == 'Paladin' ) {
            if (item.Restrictions.indexOf('dishonorable') > -1) {
              return false;
            }
          }

        }

        // check any anti flags
        if (checkAntiFlags.length) {
          for (const flag of checkAntiFlags) {
            if (item["Anti-Flags"] && item["Anti-Flags"].indexOf(flag) > -1) {
              return false;
            }
          }
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
    searchText: "",
    levelRange: [0, 90],
    charAlignment: null,
    charClass: null,
    charRace: null,

    selectedItem: null,

    charClasses: [
      "Bard",
      "Cleric",
      "Druid",
      "Mage",
      "Monk",
      "Paladin",
      "Ranger",
      "Thief",
      "Warrior"
    ],
    charRaces: [
      "Ogre",
      "Troll",
      "Orc",
      "Vyan",
      "Goblin",
      "Human",
      "Lizard",
      "Dwarf",
      "Halfing",
      "Gnome",
      "Ent",
      "Elf"
    ],
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
    ],

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

  methods: {}
});
</script>
