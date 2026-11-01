import { ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import { buildShareQuery, type CatalogFilterState } from './useCatalogQuery'
import type { CharacterProfile, WeightConfig } from '../presets/types'

/** Copy a shareable absolute URL for the current route (expanded preset values). */
export async function copyShareLink(options: {
  router: Router
  route: RouteLocationNormalizedLoaded
  filterState: CatalogFilterState
  activeProfile: CharacterProfile | null
  activeWeights: WeightConfig | null
}): Promise<boolean> {
  const query = buildShareQuery(
    options.filterState,
    options.activeProfile,
    options.activeWeights,
  )
  const resolved = options.router.resolve({
    path: options.route.path,
    query,
  })
  const url = new URL(resolved.href, window.location.origin).toString()
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

export function useShareFeedback() {
  const shareCopied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  const flashCopied = () => {
    shareCopied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      shareCopied.value = false
    }, 1600)
  }
  return { shareCopied, flashCopied }
}
