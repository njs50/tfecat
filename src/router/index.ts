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
      // Legacy shareable item URLs → catalog + overlay query (keeps filters shareable).
      path: '/item/:itemKey',
      name: 'item',
      redirect: (to) => ({
        name: 'catalog',
        query: {
          ...to.query,
          item: String(to.params.itemKey ?? ''),
        },
      }),
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
