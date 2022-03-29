import Axios from 'axios'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    catalog: null,
    itemTypes: null,
    itemAffects: null,
    itemProperties: null,
    itemClasses: null,
  },
  getters: {
    CATALOG: state => {
      return state.catalog
    },
    ITEM_TYPES: state => {
      return state.itemTypes
    },
    ITEM_CLASSES: state => {
      return state.itemClasses
    },
    ITEM_AFFECTS: state => {
      return state.itemAffects
    },
    ITEM_PROPERTIES: state => {
      return state.itemProperties
    },
  },
  mutations: {
    SET_CATALOG : (state, payload) => {
      state.catalog = payload
    },
    SET_ITEM_TYPES : (state, payload) => {
      state.itemTypes = payload
    },
    SET_ITEM_CLASSES : (state, payload) => {
      state.itemClasses = payload
    },
    SET_ITEM_AFFECTS : (state, payload) => {
      state.itemAffects = payload
    },
    SET_ITEM_PROPERTIES : (state, payload) => {
      state.itemProperties = payload
    },

  },
  actions: {
    GET_CATALOG : async (context) => {
      const { data } = await Axios.get('./catalog.json?_='+ (new Date().getTime()).toString() )

      let catalog: any[] = [];
      const itemTypes: any = {};
      const itemAffects: any = {};
      const itemProps: any = {}
      const itemClasses: any = {}
      // const
      Object.keys(data).forEach(key => {
        const item = data[key];

        item.name = item.name.replace(/^(A set of|A pair of|A|An|The|Some) /i, '')
        item['Unidentified Name'] = item['Unidentified Name'].replace(/^(A set of|A pair of|A|An|The|Some) /i, '')

        itemTypes[item.itemType] = true;
        if (item.Class) {
          itemClasses[item.Class] = true;
        }
        if (item.affects) {
          for (const affect of item.affects) {
            if (affect.type === 'affect') {
              itemAffects[affect.name] = true;
            } else if (affect.type === 'property') {
              itemProps[affect.name] = true;
            } else {
              console.error('unknown affect type', affect)
            }
          }
        }

        item.charAlignments = {
          "Lawful Good":  true,
          "Lawful Neutral":  true,
          "Lawful Evil":  true,
          "Neutral Good":  true,
          "True Neutral":  true,
          "Neutral Evil":  true,
          "Chaotic Good":  true,
          "Chaotic Neutral":  true,
          "Chaotic Evil": true,
        }

        item.charRaces = {
          "ogre": true,
          "troll": true,
          "orc": true,
          "vyan": true,
          "goblin": true,
          "human": true,
          "lizardfolk": true,
          "dwarf": true,
          "halfling": true,
          "gnome": true,
          "ent": true,
          "elf": true,
          "centaur": true,
        }

        item.charClasses = {
          "bard": true,
          "cleric": true,
          "druid": true,
          "harbinger": true,
          "mage": true,
          "monk": true,
          "paladin": true,
          "ranger": true,
          "reaver": true,
          "thief": true,
          "warrior": true,
        }

        item.charGenders = {
          male: true,
          female: true,
        }

        // process anti flags
        if (item["Anti-Flags"]) {
          for (let flag of item["Anti-Flags"]) {
            flag = flag.replace(/^anti-/, '');
            flag = flag.replace(/^lizardman/, 'lizardfolk');
            if (item.charRaces[flag]) {
              item.charRaces[flag] = false
            } else if (item.charClasses[flag]) {
              item.charClasses[flag] = false
            } else if (item.charGenders[flag]) {
              item.charGenders[flag] = false
            } else {
              switch(flag) {
                case 'good':
                  item.charAlignments['Lawful Good'] = false;
                  item.charAlignments['Neutral Good'] = false;
                  item.charAlignments['Chaotic Good'] = false;
                  break;
                case 'evil':
                  item.charAlignments['Lawful Evil'] = false;
                  item.charAlignments['Neutral Evil'] = false;
                  item.charAlignments['Chaotic Evil'] = false;
                  break;
                case 'lawful':
                  item.charAlignments['Lawful Good'] = false;
                  item.charAlignments['Lawful Neutral'] = false;
                  item.charAlignments['Lawful Evil'] = false;
                  break;
                case 'chaotic':
                  item.charAlignments['Chaotic Good'] = false;
                  item.charAlignments['Chaotic Neutral'] = false;
                  item.charAlignments['Chaotic Evil'] = false;
                  break;
                case 'only-good-evil':
                  item.charAlignments['Lawful Neutral'] = false;
                  item.charAlignments['True Neutral'] = false;
                  item.charAlignments['Chaotic Neutral'] = false;
                  break;
                case 'only-law-chaos':
                  item.charAlignments['Neutral Good'] = false;
                  item.charAlignments['True Neutral'] = false;
                  item.charAlignments['Neutral Evil'] = false;
                  break;
                default:
                  console.error('Unknown anti flag! - ' + flag)
              }
            }
          }
        }

        // process restrictions
        if (item.Restrictions && item.Restrictions.indexOf('bladed') > -1) {
          item.charClasses.cleric = false;
          item.charClasses.druid = false;
        }

        if (item.Restrictions && item.Restrictions.indexOf('dishonorable') > -1) {
          item.charClasses.paladin = false;
        }

        catalog.push(item);

      });

      context.commit('SET_ITEM_TYPES', Object.keys(itemTypes).sort())
      context.commit('SET_ITEM_AFFECTS', Object.keys(itemAffects).sort())
      context.commit('SET_ITEM_PROPERTIES', Object.keys(itemProps).sort())
      context.commit('SET_ITEM_CLASSES', Object.keys(itemClasses).sort())

      // sort by level then name
      catalog = catalog.sort((a, b) => {
        let dif = a.Level - b.Level;
        if (dif === 0) {
          dif = a.name.toLowerCase() < b.name.toLowerCase() ? 0 : 1
        }
        return dif;
      });
      context.commit('SET_CATALOG', catalog)
   },
  },
  modules: {
  }
})
