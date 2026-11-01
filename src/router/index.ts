import { createRouter, createWebHistory } from 'vue-router'
import CatalogView from '../views/CatalogView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'catalog',
      component: CatalogView,
    },
    {
      // Legacy/shareable `/item/:itemKey` → catalog with drawer (`?item=`).
      // Supports encoded keys; drawer opens without a standalone item page.
      path: '/item/:itemKey',
      name: 'item',
      redirect: (to) => {
        const raw = to.params.itemKey
        const key = Array.isArray(raw) ? raw[0] : String(raw ?? '')
        let item = key
        try {
          item = decodeURIComponent(key)
        } catch {
          item = key
        }
        return {
          name: 'catalog',
          query: {
            ...to.query,
            item,
          },
        }
      },
    },
    {
      path: '/weights/:id?',
      name: 'weights',
      component: () => import('../views/WeightsView.vue'),
      props: true,
    },
    {
      path: '/characters/:id?',
      name: 'characters',
      component: () => import('../views/CharactersView.vue'),
      props: true,
    },
    {
      path: '/filters',
      name: 'filters',
      component: () => import('../views/FiltersView.vue'),
    },
    {
      path: '/audit',
      name: 'audit',
      component: () => import('../views/AuditView.vue'),
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    // Browser Back/Forward restores prior scroll; in-app pushes start at top.
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

export default router
