import { onMounted, onUnmounted, ref } from 'vue'

export type AppVersionInfo = {
  sha: string
  builtAt?: string
}

const POLL_MS = 5 * 60 * 1000

function versionUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}version.json`
}

async function fetchRemoteVersion(): Promise<AppVersionInfo | null> {
  try {
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

/**
 * Polls version.json (same path for browser tab + installed PWA).
 * Shows updateAvailable when the remote SHA differs from the build that loaded this page.
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
      if (remote.sha !== buildId) {
        updateAvailable.value = true
      }
    } finally {
      checking = false
    }
  }

  const reloadToUpdate = () => {
    location.reload()
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate()
    }
  }

  onMounted(() => {
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
