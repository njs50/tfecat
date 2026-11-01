import { onMounted, onUnmounted, ref } from 'vue'

export type AppVersionInfo = {
  sha: string
  builtAt?: string
}

const POLL_MS = 5 * 60 * 1000
/** sessionStorage: SHA we asked Reload to fetch (survives soft reload races). */
const PENDING_VERSION_KEY = 'tfecat.pendingVersion'
/** Query param to bypass GitHub Pages HTML cache (max-age=600) on Reload. */
const RELOAD_PARAM = '_tfecat_reload'

function versionUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}version.json`
}

async function fetchRemoteVersion(): Promise<AppVersionInfo | null> {
  try {
    // Always bypass HTTP cache so we notice deploys even while index.html is
    // still CDN-cached (Pages serves everything with max-age=600).
    const res = await fetch(`${versionUrl()}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<AppVersionInfo>
    if (!data || typeof data.sha !== 'string' || !data.sha) return null
    return { sha: data.sha, builtAt: typeof data.builtAt === 'string' ? data.builtAt : undefined }
  } catch {
    return null
  }
}

function stripReloadParam(): void {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(RELOAD_PARAM)) return
    url.searchParams.delete(RELOAD_PARAM)
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(window.history.state, '', next)
  } catch {
    // ignore
  }
}

/**
 * Polls version.json (same path for browser tab + installed PWA).
 * Shows updateAvailable when the remote SHA differs from the build that loaded this page.
 *
 * GitHub Pages caches HTML + version.json with max-age≈600s. We deliberately
 * bypass cache for version.json so deploys are visible quickly — but then a plain
 * `location.reload()` can keep serving a stale index (old VITE_BUILD_ID) against
 * a fresh version.json, so the snackbar reappears. Reload navigates with a bust
 * query so the document is re-fetched.
 */
export function useAppUpdate() {
  const updateAvailable = ref(false)
  const remoteSha = ref<string | null>(null)
  const buildId = import.meta.env.VITE_BUILD_ID || 'dev'

  let timer: ReturnType<typeof setInterval> | null = null
  let checking = false

  const checkForUpdate = async () => {
    if (checking) return
    checking = true
    try {
      const remote = await fetchRemoteVersion()
      if (!remote) return
      remoteSha.value = remote.sha

      if (remote.sha === buildId) {
        updateAvailable.value = false
        try {
          sessionStorage.removeItem(PENDING_VERSION_KEY)
        } catch {
          // ignore
        }
        return
      }

      // Still on an older shell than version.json reports.
      updateAvailable.value = true
    } finally {
      checking = false
    }
  }

  const reloadToUpdate = () => {
    const target = remoteSha.value || String(Date.now())
    try {
      sessionStorage.setItem(PENDING_VERSION_KEY, target)
    } catch {
      // ignore
    }
    // New URL → skip CDN-cached index.html for this navigation.
    const url = new URL(window.location.href)
    url.searchParams.set(RELOAD_PARAM, target.slice(0, 12))
    window.location.replace(url.toString())
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate()
    }
  }

  onMounted(() => {
    stripReloadParam()
    void checkForUpdate()
    timer = setInterval(() => {
      void checkForUpdate()
    }, POLL_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onVisibility)
  })

  return {
    updateAvailable,
    remoteSha,
    buildId,
    checkForUpdate,
    reloadToUpdate,
  }
}
