<template>
  <v-container fluid class="pa-6">
    <p class="text-body-2 text-medium-emphasis">Opening item…</p>
  </v-container>
</template>

<script setup lang="ts">
/**
 * Legacy `/item/:itemKey` now redirects in the router to `/?item=…`
 * (catalog + temporary drawer). This file remains only as a safety net
 * if something still navigates here without the redirect.
 */
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'ItemView' })

const props = defineProps<{ itemKey: string }>()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  router.replace({
    name: 'catalog',
    query: { ...route.query, item: props.itemKey },
  })
})
</script>
