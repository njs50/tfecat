import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** Query key for the dismissible item overlay (shareable on catalog/audit). */
export const ITEM_QUERY_KEY = 'item'

const OVERLAY_ROUTE_NAMES = new Set(['audit', 'catalog', 'filters'])

/** Read `?item=` whether Vue Router gave a string or string[]. */
export function readItemQuery(query: LocationQuery | LocationQueryRaw): string | null {
  const value = query[ITEM_QUERY_KEY]
  if (typeof value === 'string' && value.length) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length) return value[0]
  return null
}

function overlayRouteName(name: string | symbol | null | undefined): 'catalog' | 'audit' | 'filters' {
  const key = String(name ?? '')
  return OVERLAY_ROUTE_NAMES.has(key) ? (key as 'catalog' | 'audit' | 'filters') : 'catalog'
}

/** Build a same-page link that opens the item overlay without leaving catalog/audit. */
export function itemOverlayLocation(
  itemKey: string,
  route: { name?: string | symbol | null; query: LocationQueryRaw },
): RouteLocationRaw {
  return {
    name: overlayRouteName(route.name),
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
    router.push({ name: overlayRouteName(route.name), query })
  }

  /** Absolute app href for an overlay link (middle-click / share). */
  const itemOverlayHref = (itemKey: string) =>
    router.resolve(itemOverlayLocation(itemKey, route)).href

  /**
   * Open the item drawer via `?item=`. Pass the click event so callers can
   * preventDefault (audit anchors) without relying only on template modifiers.
   */
  const openItemOverlay = (itemKey: string, event?: Event) => {
    event?.preventDefault()
    event?.stopPropagation()
    const key = String(itemKey ?? '').trim()
    if (!key) return
    if (overlayItemKey.value === key && OVERLAY_ROUTE_NAMES.has(String(route.name ?? ''))) {
      return
    }
    void router.push(itemOverlayLocation(key, route))
  }

  return {
    overlayItemKey,
    overlayOpen,
    itemOverlayHref,
    openItemOverlay,
    closeItemOverlay,
  }
}
