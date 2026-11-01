import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** Query key for the dismissible item overlay (shareable on catalog/audit). */
export const ITEM_QUERY_KEY = 'item'

/** Read `?item=` whether Vue Router gave a string or string[]. */
export function readItemQuery(query: LocationQuery | LocationQueryRaw): string | null {
  const value = query[ITEM_QUERY_KEY]
  if (typeof value === 'string' && value.length) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length) return value[0]
  return null
}

/** Build a same-page link that opens the item overlay without leaving catalog/audit. */
export function itemOverlayLocation(
  itemKey: string,
  route: { name?: string | symbol | null; query: LocationQueryRaw },
): RouteLocationRaw {
  const name =
    route.name === 'audit' || route.name === 'catalog' || route.name === 'filters'
      ? (route.name as string)
      : 'catalog'
  return {
    name,
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

  const overlayItemKey = computed(() => readItemQuery(route.query))
  const overlayOpen = computed(() => !!overlayItemKey.value)

  const closeItemOverlay = () => {
    if (!overlayOpen.value) return
    const query = { ...route.query }
    delete query[ITEM_QUERY_KEY]
    const name =
      route.name === 'audit' || route.name === 'catalog' || route.name === 'filters'
        ? (route.name as string)
        : 'catalog'
    router.push({ name, query })
  }

  /** Open after the triggering click settles so a temporary drawer isn’t instantly dismissed. */
  const openItemOverlay = (itemKey: string) => {
    void nextTick(() => {
      router.push(itemOverlayLocation(itemKey, route))
    })
  }

  return {
    overlayItemKey,
    overlayOpen,
    openItemOverlay,
    closeItemOverlay,
  }
}
