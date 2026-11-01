<template>
  <v-app id="tfecat">
    <!-- Brand + nav are siblings (not one short header) so sticky nav can pin for the whole page. -->
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
            <BrandMark class="brand-mark mr-3" />
            <span class="brand-wordmark" aria-hidden="true">
              <span class="brand-wordmark__tfe">TFE</span><span class="brand-wordmark__cat">cat</span>
            </span>
          </v-btn>
          <v-spacer></v-spacer>
          <v-dialog max-width="600" v-model="isInstallModalVisible">
            <template #activator="{ props }">
              <v-btn
                class="install-button"
                color="primary"
                variant="elevated"
                prepend-icon="mdi-console-line"
                v-bind="props"
              >
                Install CLI
              </v-btn>
            </template>
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
        </div>
      </v-container>
    </div>

    <!-- Only this row sticks; brand scrolls away. Search + filters toggle live here. -->
    <div ref="navStickyEl" class="nav-sticky">
      <v-container fluid class="header-shell px-6 px-sm-8 nav-shell">
        <div class="nav-row">
          <nav aria-label="Primary" class="primary-nav">
            <router-link
              :to="catalogNavTo"
              class="nav-link"
              :class="{ 'nav-link--active': catalogNavActive }"
              :aria-current="catalogNavActive ? 'page' : undefined"
            >
              Item catalog
            </router-link>
            <!-- Coming soon — keep for upcoming trainers / item-audit pages
            <a :href="`${catalogHref}trainers`" class="nav-link">Trainers</a>
            <a :href="`${catalogHref}item-audit`" class="nav-link">Item audit</a>
            -->
          </nav>
          <div class="nav-tools">
            <v-btn
              icon
              variant="tonal"
              density="comfortable"
              :color="filtersPageActive ? 'primary' : undefined"
              :aria-pressed="filtersPageActive"
              aria-label="Toggle filters"
              @click="toggleFiltersPage"
            >
              <v-icon>mdi-filter-variant</v-icon>
            </v-btn>
            <v-text-field
              v-model="searchText"
              append-inner-icon="mdi-magnify"
              label="Search items"
              single-line
              hide-details
              clearable
              density="compact"
              variant="outlined"
              class="nav-search"
            ></v-text-field>
          </div>
        </div>
      </v-container>
    </div>

    <v-main>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BrandMark from './components/BrandMark.vue'
import { useAppUpdate } from './composables/useAppUpdate'
import { useCatalogFilters } from './composables/useCatalogFilters'

const route = useRoute()
const { updateAvailable, reloadToUpdate } = useAppUpdate()
const {
  searchText,
  filtersPageActive,
  toggleFiltersPage,
  ensureFilterSync,
} = useCatalogFilters()

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

/** Publish sticky-nav height for catalog viewport-fill layout. */
const navStickyEl = ref<HTMLElement | null>(null)
let navResizeObserver: ResizeObserver | null = null

const syncNavHeightVar = () => {
  const h = navStickyEl.value?.offsetHeight ?? 0
  document.documentElement.style.setProperty('--tfecat-nav-height', `${h}px`)
}

onMounted(() => {
  syncNavHeightVar()
  if (navStickyEl.value && typeof ResizeObserver !== 'undefined') {
    navResizeObserver = new ResizeObserver(syncNavHeightVar)
    navResizeObserver.observe(navStickyEl.value)
  }
  // Hydrate shared filter/search state even before CatalogView mounts.
  ensureFilterSync()
})

onBeforeUnmount(() => {
  navResizeObserver?.disconnect()
  navResizeObserver = null
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
  /* Router :to marks this active on catalog; keep transparent like prod :href. */
  background: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
}

.brand-link :deep(.v-btn__overlay),
.brand-link :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.brand-mark {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
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

.nav-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.nav-shell {
  padding-top: 12px;
}

.nav-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
}

.primary-nav {
  display: flex;
  gap: 32px;
  flex: 0 0 auto;
  align-self: flex-end;
}

.nav-tools {
  display: flex;
  flex: 1 1 240px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  padding-bottom: 8px;
}

.nav-search {
  max-width: 360px;
  flex: 1 1 220px;
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
