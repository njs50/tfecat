import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** Query key for the dismissible item overlay (shareable on catalog/audit). */
export const ITEM_QUERY_KEY = 'item'

function strQuery(value: unknown): string | null {
  if (typeof value === 'string' && value.length) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length) return value[0]
  return null
}

/** Build a same-page link that opens the item overlay without leaving catalog/audit. */
export function itemOverlayLocation(
  itemKey: string,
  route: { name?: string | symbol | null; query: LocationQueryRaw },
): RouteLocationRaw {
  return {
    name: (route.name as string) || 'catalog',
    query: {
      ...route.query,
      [ITEM_QUERY_KEY]: itemKey,
    },
  }
}

/**
 * Item detail as a temporary overlay over catalog/audit.
 * Driven by `?item=` so the parent route (and keep-alive state) stay put.
 */
export function useItemOverlay() {
  const route = useRoute()
  const router = useRouter()

  const overlayItemKey = computed(() => strQuery(route.query[ITEM_QUERY_KEY]))
  const overlayOpen = computed(() => !!overlayItemKey.value)

  const closeItemOverlay = () => {
    if (!overlayOpen.value) return
    const query = { ...route.query }
    delete query[ITEM_QUERY_KEY]
    router.push({ name: route.name as string, query })
  }

  const openItemOverlay = (itemKey: string) => {
    router.push(itemOverlayLocation(itemKey, route))
  }

  return {
    overlayItemKey,
    overlayOpen,
    openItemOverlay,
    closeItemOverlay,
  }
}
