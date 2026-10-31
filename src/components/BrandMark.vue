<template>
  <svg aria-hidden="true" viewBox="0 0 392 392" xmlns="http://www.w3.org/2000/svg">
    <rect width="392" height="392" rx="92" fill="currentColor" class="brand-mark__tile" />
    <path d="M91 128V69L149 101C164 96 180 93 196 93C212 93 228 96 243 101L301 69V128C326 156 340 191 340 230C340 310 278 338 196 338C114 338 52 310 52 230C52 191 66 156 91 128Z" class="brand-mark__cat" />
    <path d="M91 69L149 101L91 128V69ZM301 69L243 101L301 128V69Z" class="brand-mark__ear" />
    <path d="M121 199L158 230L121 261" fill="none" class="brand-mark__prompt" stroke-linecap="square" stroke-linejoin="miter" stroke-width="18" />
    <path d="M194 261H269" fill="none" class="brand-mark__prompt" stroke-linecap="square" stroke-width="18" />
  </svg>
</template>

<style scoped>
.brand-mark__tile { color: rgb(var(--v-theme-surface-variant)); }
.brand-mark__cat { fill: rgb(var(--v-theme-primary)); }
.brand-mark__ear { fill: rgb(var(--v-theme-background)); opacity: 0.2; }
.brand-mark__prompt { stroke: rgb(var(--v-theme-background)); }
</style>
