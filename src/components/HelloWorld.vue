<template>
  <v-container>
    <v-list-item v-for="(item, vnum) in catalog" :key="vnum">
      <v-list-item-content>
        <v-list-item-title>{{item.name}}</v-list-item-title>
      </v-list-item-content>
    </v-list-item>
  </v-container>
</template>

<script lang="ts">
  import Vue from 'vue'

  export default Vue.extend({
    name: 'HelloWorld',

    mounted() {
      this.$store.dispatch('GET_CATALOG')
    },

    computed: {
      catalog () {
        return this.$store.getters.CATALOG
      }
    },

    data: () => ({

    }),

  })
</script>
