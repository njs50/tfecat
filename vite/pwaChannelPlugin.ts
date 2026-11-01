import type { Plugin } from 'vite'

type VersionInfo = {
  sha: string
  builtAt: string
}

function channelFromBase(base: string): { slug: string; scope: string; isPreview: boolean } {
  const normalized = base.endsWith('/') ? base : `${base}/`
  const slug = normalized.replace(/^\/+|\/+$/g, '') || 'dev'
  return {
    slug,
    scope: normalized === '//' ? '/' : normalized,
    isPreview: slug === 'tcat-preview',
  }
}

/**
 * Emits version.json + a channel-specific web app manifest.
 * Icon paths match PR #52 (`public/icons/…`); those files are not shipped here.
 */
export function pwaChannelPlugin(): Plugin {
  let base = '/'
  let outDir = 'dist'

  return {
    name: 'tfecat-pwa-channel',
    configResolved(config) {
      base = config.base || '/'
      outDir = config.build.outDir || 'dist'
    },
    generateBundle() {
      const sha =
        process.env.VITE_BUILD_ID ||
        process.env.GITHUB_SHA ||
        'dev'
      const version: VersionInfo = {
        sha,
        builtAt: new Date().toISOString(),
      }
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(version, null, 2)}\n`,
      })

      const { scope, isPreview } = channelFromBase(base)
      const name = isPreview ? 'TFEcat Item Catalog (Preview)' : 'TFEcat Item Catalog'
      const shortName = isPreview ? 'TFEcat Prev' : 'TFEcat'
      // Absolute-ish id so Chromium keeps prod + preview as separate installs.
      const id = scope

      // Paths relative to manifest URL (same directory as index under base).
      // Assets land with #52 (Figma brand PR); do not invent art here.
      const icons = [
        {
          src: 'icons/tfecat-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'icons/tfecat-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'icons/tfecat-maskable-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: 'icons/tfecat-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: 'icons/tfecat-monochrome.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'monochrome',
        },
      ]

      const manifest = {
        id,
        name,
        short_name: shortName,
        description: isPreview
          ? 'TFEcat preview build for testing'
          : 'The Forgotten Elements item catalog',
        start_url: scope,
        scope,
        display: 'standalone',
        background_color: '#101513',
        theme_color: '#101513',
        icons,
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      })

      // Silence unused when tree-shaken in odd configs
      void outDir
    },
  }
}
