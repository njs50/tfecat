import Axios from 'axios'
import { defineStore } from 'pinia'
import { EXTRA_ITEM_PROPERTIES } from '../itemProperties'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    catalog: null as any[] | null,
    itemTypes: null as string[] | null,
    itemAffects: null as string[] | null,
    itemProperties: null as string[] | null,
    itemClasses: null as string[] | null,
  }),
  actions: {
    async fetchCatalog() {
      const { data } = await Axios.get('./catalog.json?_=' + (new Date().getTime()).toString())

      const catalog: any[] = []
      const itemTypes: Record<string, boolean> = {}
      const itemAffects: Record<string, boolean> = {}
      const itemProps: Record<string, boolean> = {}
      const itemClasses: Record<string, boolean> = {}

      Object.keys(data).forEach(key => {
        const item = data[key]

        item.name = item.name.replace(/^(A set of|A pair of|A|An|The|Some) /i, '')
        item['Unidentified Name'] = item['Unidentified Name'].replace(/^(A set of|A pair of|A|An|The|Some) /i, '')

        itemTypes[item.itemType] = true
        if (item.Class) {
          itemClasses[item.Class] = true
        }
        if (item.affects) {
          for (const affect of item.affects) {
            if (affect.type === 'affect') {
              itemAffects[affect.name] = true
            } else if (affect.type === 'property') {
              itemProps[affect.name] = true
            } else {
              console.error('unknown affect type', affect)
            }
          }
        }

        item.charAlignments = {
          "Lawful Good": true,
          "Lawful Neutral": true,
          "Lawful Evil": true,
          "Neutral Good": true,
          "True Neutral": true,
          "Neutral Evil": true,
          "Chaotic Good": true,
          "Chaotic Neutral": true,
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
          "bulwark": true,
          "cleric": true,
          "druid": true,
          "harbinger": true,
          "mage": true,
          "monk": true,
          "legate": true,
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
            flag = flag.replace(/^anti-/, '')
            flag = flag.replace(/^lizardman/, 'lizardfolk')
            if (item.charRaces[flag]) {
              item.charRaces[flag] = false
            } else if (item.charClasses[flag]) {
              item.charClasses[flag] = false
            } else if (item.charGenders[flag]) {
              item.charGenders[flag] = false
            } else {
              switch (flag) {
                case 'good':
                  item.charAlignments['Lawful Good'] = false
                  item.charAlignments['Neutral Good'] = false
                  item.charAlignments['Chaotic Good'] = false
                  break
                case 'evil':
                  item.charAlignments['Lawful Evil'] = false
                  item.charAlignments['Neutral Evil'] = false
                  item.charAlignments['Chaotic Evil'] = false
                  break
                case 'lawful':
                  item.charAlignments['Lawful Good'] = false
                  item.charAlignments['Lawful Neutral'] = false
                  item.charAlignments['Lawful Evil'] = false
                  break
                case 'chaotic':
                  item.charAlignments['Chaotic Good'] = false
                  item.charAlignments['Chaotic Neutral'] = false
                  item.charAlignments['Chaotic Evil'] = false
                  break
                case 'only-good-evil':
                  item.charAlignments['Lawful Neutral'] = false
                  item.charAlignments['True Neutral'] = false
                  item.charAlignments['Chaotic Neutral'] = false
                  break
                case 'only-law-chaos':
                  item.charAlignments['Neutral Good'] = false
                  item.charAlignments['True Neutral'] = false
                  item.charAlignments['Neutral Evil'] = false
                  break
                default:
                  console.error('Unknown anti flag! - ' + flag)
              }
            }
          }
        }

        // process restrictions
        if (item.Restrictions && item.Restrictions.indexOf('bladed') > -1) {
          item.charClasses.cleric = false
          item.charClasses.druid = false
        }

        if (item.Restrictions && item.Restrictions.indexOf('dishonorable') > -1) {
          item.charClasses.paladin = false
        }

        catalog.push(item)
      })

      this.itemTypes = Object.keys(itemTypes).sort()
      this.itemAffects = Object.keys(itemAffects).sort()
      // Native fields + computed totals (regen/resist/smart) alongside catalog properties.
      for (const name of EXTRA_ITEM_PROPERTIES) {
        itemProps[name] = true
      }
      this.itemProperties = Object.keys(itemProps).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      )
      this.itemClasses = Object.keys(itemClasses).sort()

      // sort by level then name
      catalog.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level
        }
        return a.name.localeCompare(b.name)
      })

      this.catalog = catalog
    },
  },
})
