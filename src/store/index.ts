import Axios from 'axios'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    catalog: null
  },
  getters: {
    CATALOG: state => {
      return state.catalog
    }
  },
  mutations: {
    SET_CATALOG : (state, payload) => {
      state.catalog = payload
    },
  },
  actions: {
    GET_CATALOG : async (context) => {
      const { data } = await Axios.get('./catalog.json?_='+ (new Date().getTime()).toString() )

      let catalog: any[] = [];
      Object.keys(data).forEach(key => {
        const item = data[key];
        // item.name = item.name.replace(/^(A|An|The) /i, '');
        catalog.push(item);
      });

      // sort by level then name
      catalog = catalog.sort((a, b) => {
        let dif = a.level - b.level;
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
