<template>
  <v-app id="sandbox">
    <v-navigation-drawer
      :clipped="true"
      :permanent="true"
      :temporary="false"
      app
      overflow
    ></v-navigation-drawer>

    <v-app-bar
      :clipped-left="true"
      app
    >
      <v-icon>mdi-cat</v-icon>
      <v-toolbar-title>TFE Cat</v-toolbar-title>
    </v-app-bar>

    <v-content>
      <v-container fluid>
        <v-row
          align="center"
          justify="center"
        >
          <v-col cols="10">

            <HelloWorld />

          </v-col>
        </v-row>
      </v-container>
    </v-content>

    <v-footer
      :inset="footer.inset"
      app
    >
      <span class="px-4">&copy; {{ new Date().getFullYear() }}</span>
    </v-footer>
  </v-app>
</template>

<script lang="ts">

import Vue from 'vue';
import HelloWorld from './components/HelloWorld.vue';

export default Vue.extend({
  name: 'App',

  components: {
    HelloWorld,
  },

  data: () => ({
    drawers: ['Default (no property)', 'Permanent', 'Temporary'],
    primaryDrawer: {
      model: null,
      type: 'permanent',
      clipped: true,
      floating: false,
      mini: false,
    },
    footer: {
      inset: false,
    },
  }),
});
</script>
