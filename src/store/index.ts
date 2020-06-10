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
