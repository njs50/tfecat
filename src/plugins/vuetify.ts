import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Vuetify 4 defaults to system theme; keep the previous dark UI explicit.
export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'tfecatDark',
    themes: {
      tfecatDark: {
        dark: true,
        colors: {
          background: '#101513', surface: '#121816', 'surface-variant': '#18211d',
          primary: '#b8f36b', 'on-primary': '#101513', secondary: '#92a099', 'on-surface': '#e9f0ec',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi'
  }
})
