<template>
  <v-app id="tfecat">
    <!--
      Fixed chrome (option 4a): brand stays in the reserved header — no scroll-away.
      Height is measured into --tfecat-chrome-height so the catalog fills the rest
      with a single table scrollbar.
    -->
    <div ref="chromeEl" class="app-chrome">
      <!-- Large: brand row + nav row (current desktop layout, fixed). -->
      <template v-if="mdAndUp">
        <div class="brand-block">
          <v-container fluid class="header-shell px-6 px-sm-8">
            <div class="brand-row">
              <v-btn
                :to="{ name: 'catalog', query: route.query }"
                :active="false"
                aria-label="TFEcat item catalog home"
                class="brand-link text-none px-0"
                variant="text"
                :ripple="false"
                slim
              >
                <BrandMark class="brand-mark brand-mark--lg mr-3" />
                <span class="brand-wordmark" aria-hidden="true">
                  <span class="brand-wordmark__tfe">TFE</span><span class="brand-wordmark__cat">cat</span>
                </span>
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn
                class="install-button"
                color="primary"
                variant="elevated"
                prepend-icon="mdi-console-line"
                @click="isInstallModalVisible = true"
              >
                Install CLI
              </v-btn>
            </div>
          </v-container>
        </div>

        <div class="nav-block">
          <v-container fluid class="header-shell px-6 px-sm-8 nav-shell">
            <nav aria-label="Primary" class="primary-nav">
              <router-link
                :to="catalogNavTo"
                class="nav-link"
                :class="{ 'nav-link--active': catalogNavActive }"
                :aria-current="catalogNavActive ? 'page' : undefined"
              >
                Item catalog
              </router-link>
            </nav>
          </v-container>
        </div>
      </template>

      <!-- Medium / small: brand icon + nav (+ install on sm–md only) on one row. -->
      <template v-else>
        <div class="nav-block nav-block--compact">
          <v-container fluid class="header-shell px-4 px-sm-6 nav-shell nav-shell--compact">
            <div class="compact-row">
              <v-btn
                :to="{ name: 'catalog', query: route.query }"
                :active="false"
                aria-label="TFEcat item catalog home"
                class="brand-link brand-link--compact text-none px-0"
                variant="text"
                :ripple="false"
                slim
              >
                <BrandMark class="brand-mark brand-mark--compact" />
              </v-btn>
              <nav aria-label="Primary" class="primary-nav primary-nav--compact">
                <router-link
                  :to="catalogNavTo"
                  class="nav-link"
                  :class="{ 'nav-link--active': catalogNavActive }"
                  :aria-current="catalogNavActive ? 'page' : undefined"
                >
                  Item catalog
                </router-link>
              </nav>
              <v-spacer></v-spacer>
              <!-- Smallest (xs): drop Install CLI entirely. -->
              <v-btn
                v-if="smAndUp"
                class="install-button install-button--compact"
                color="primary"
                variant="elevated"
                prepend-icon="mdi-console-line"
                @click="isInstallModalVisible = true"
              >
                Install CLI
              </v-btn>
            </div>
          </v-container>
        </div>
      </template>
    </div>

    <v-dialog max-width="600" v-model="isInstallModalVisible">
      <v-card class="modal-card">
        <v-card-title class="modal-title d-flex align-center">
          <v-icon class="mr-3" color="primary">mdi-package-variant</v-icon>
          <span>Install the tfecat mudlet package</span>
        </v-card-title>
        <v-card-text class="modal-content pa-4">
          <div class="mb-4">
            <p class="text-body-large mb-3">
              To install the tfecat package for the first time, copy and paste the following
              command into your Mudlet input bar:
            </p>
          </div>
          <v-textarea
            ref="installInput"
            readonly
            v-model="installCode"
            variant="outlined"
            density="compact"
            bg-color="grey-darken-4"
            class="font-mono"
            hide-details
            rows="3"
            auto-grow
          ></v-textarea>
          <div class="mt-3 text-body-small text-grey-lighten-1">
            <v-icon size="small" class="mr-1">mdi-lightbulb</v-icon>
            Click the copy button to copy the command to your clipboard
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="modal-actions pa-4">
          <v-spacer></v-spacer>
          <v-btn
            color="secondary"
            variant="outlined"
            prepend-icon="mdi-content-copy"
            @click="copyInstall"
          >
            Copy
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-check"
            @click="isInstallModalVisible = false"
          >
            Got it!
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-main class="app-main">
      <!-- Keep CatalogView mounted so item ↔ search keeps filters/sort/scroll. -->
      <router-view v-slot="{ Component }">
        <keep-alive :include="['CatalogView']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </v-main>

    <div
      v-if="previewWatermark"
      class="preview-watermark"
      aria-hidden="true"
    >{{ previewWatermark }}</div>

    <v-snackbar
      v-model="updateAvailable"
      :timeout="-1"
      color="primary"
      location="bottom"
      multi-line
    >
      A new version is available.
      <template #actions>
        <v-btn variant="text" @click="reloadToUpdate">Reload</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import BrandMark from './components/BrandMark.vue'
import { useAppUpdate } from './composables/useAppUpdate'
import { useCatalogFilters } from './composables/useCatalogFilters'

const route = useRoute()
const { mdAndUp, smAndUp } = useDisplay()
const { updateAvailable, reloadToUpdate } = useAppUpdate()
const { ensureFilterSync } = useCatalogFilters()

/** Listing + item detail share the catalog section in the main nav. */
const catalogNavActive = computed(
  () => route.name === 'catalog' || route.name === 'item',
)

/** Always target the search listing (keeps query → filters/sort via keep-alive). */
const catalogNavTo = computed(() => ({
  name: 'catalog' as const,
  query: route.query,
}))

const isInstallModalVisible = ref(false)
const installCode = ref(
  `lua postPMInstall='tfecat'; uninstallPackage('njs50-package-manager'); installPackage('https://raw.githubusercontent.com/njs50/njs50-package-manager/main/njs50-package-manager.xml')`,
)

/** Full fixed-chrome height for catalog viewport-fill layout. */
const chromeEl = ref<HTMLElement | null>(null)
let chromeResizeObserver: ResizeObserver | null = null

const syncChromeHeightVar = () => {
  const h = chromeEl.value?.offsetHeight ?? 0
  const px = `${h}px`
  document.documentElement.style.setProperty('--tfecat-chrome-height', px)
  // Alias used by catalog fill-height shell.
  document.documentElement.style.setProperty('--tfecat-nav-height', px)
}

onMounted(() => {
  syncChromeHeightVar()
  if (chromeEl.value && typeof ResizeObserver !== 'undefined') {
    chromeResizeObserver = new ResizeObserver(syncChromeHeightVar)
    chromeResizeObserver.observe(chromeEl.value)
  }
  ensureFilterSync()
})

// Breakpoint swaps change chrome height without a resize of the same node tree.
watch([mdAndUp, smAndUp], async () => {
  await Promise.resolve()
  syncChromeHeightVar()
})

onBeforeUnmount(() => {
  chromeResizeObserver?.disconnect()
  chromeResizeObserver = null
})

/** Branch + short SHA; only when preview-deploy sets VITE_PREVIEW_*. */
const previewWatermark = computed(() => {
  const refName = import.meta.env.VITE_PREVIEW_REF
  const sha = import.meta.env.VITE_PREVIEW_SHA
  if (!refName || !sha) return ''
  return `${refName} · ${String(sha).slice(0, 7)}`
})

const copyInstall = () => {
  const textarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement
  if (textarea) {
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
  }
}
</script>

<style scoped>
.header-shell {
  max-width: 1280px;
}

.app-chrome {
  position: sticky;
  top: 0;
  z-index: 100;
  flex: 0 0 auto;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.brand-block {
  padding-top: 20px;
  background: rgb(var(--v-theme-surface));
}

.brand-row {
  display: flex;
  align-items: center;
  height: 56px;
}

.brand-link {
  min-width: 0;
  height: 56px !important;
  background: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
}

.brand-link--compact {
  height: 40px !important;
  width: 40px !important;
  min-width: 40px !important;
}

.brand-link :deep(.v-btn__overlay),
.brand-link :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.brand-mark {
  flex: 0 0 auto;
}

.brand-mark--lg {
  width: 56px;
  height: 56px;
}

.brand-mark--compact {
  width: 40px;
  height: 40px;
}

.brand-wordmark {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: -0.08em;
  line-height: 1;
}

.brand-wordmark__tfe {
  color: rgb(var(--v-theme-on-surface));
}

.brand-wordmark__cat {
  color: rgb(var(--v-theme-primary));
}

.install-button {
  min-height: 40px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.install-button--compact {
  min-height: 32px !important;
  height: 32px !important;
  padding-inline: 10px !important;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
}

.install-button--compact :deep(.v-btn__prepend) {
  margin-inline-end: 6px;
}

.install-button--compact :deep(.v-icon) {
  font-size: 1rem !important;
}

.nav-shell {
  padding-top: 20px;
}

.nav-shell--compact {
  padding-top: 8px;
  padding-bottom: 0;
}

.compact-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  min-height: 48px;
}

.primary-nav {
  display: flex;
  gap: 32px;
}

.primary-nav--compact {
  gap: 20px;
  align-self: flex-end;
}

.nav-link {
  position: relative;
  flex: 0 0 auto;
  padding-bottom: 16px;
  color: #738078;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  line-height: 1;
  text-decoration: none;
  text-transform: uppercase;
  transition: color 120ms ease;
  white-space: nowrap;
}

.nav-link:hover,
.nav-link:focus-visible,
.nav-link--active {
  color: rgb(var(--v-theme-on-surface));
}

.nav-link:focus-visible {
  outline: none;
}

.nav-link--active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 4px;
  background: rgb(var(--v-theme-primary));
  content: '';
}

.app-main {
  /* Catalog fill-height accounts for chrome; avoid v-main padding fighting the math. */
  --v-layout-top: 0px;
}

.preview-watermark {
  position: fixed;
  left: 8px;
  bottom: 6px;
  z-index: 9999;
  pointer-events: none;
  font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: rgba(255, 255, 255, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
}
</style>

<style>
/* Modal contrast — shared with item/install dialogs */
.modal-card {
  border: 2px solid #424242 !important;
  background: #1e1e1e !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8) !important;
}

.modal-title {
  background: #2d2d2d !important;
  border-bottom: 1px solid #424242 !important;
}

.modal-content {
  background: #1e1e1e !important;
}

.modal-actions {
  background: #2d2d2d !important;
  border-top: 1px solid #424242 !important;
}

.v-dialog .v-overlay__scrim {
  background: rgba(0, 0, 0, 0.7) !important;
}
</style>
