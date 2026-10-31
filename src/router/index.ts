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
      path: '/item/:itemKey',
      name: 'item',
      component: () => import('../views/ItemView.vue'),
      props: true,
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
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
