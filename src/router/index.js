import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Projects from '../views/Projects.vue';
import DevDetail from '../views/DevDetail.vue';
import Developers from '../views/Developers.vue';
import Timeline from '../views/Timeline.vue';
import Login from '../views/Login.vue';
import { useAuthStore } from '../stores/auth';
import { isLocalDev } from '../utils/sqlite';

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  { path: '/', name: 'dashboard', component: Dashboard },
  { path: '/projects', name: 'projects', component: Projects },
  { path: '/developers', name: 'developers', component: Developers },
  { path: '/timeline', name: 'timeline', component: Timeline },
  { path: '/dev/:dev', name: 'devDetail', component: DevDetail, props: true }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    // Always scroll to top on navigation
    return { left: 0, top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) await auth.init();
  if (isLocalDev()) {
    // In local dev, treat all routes as public; ensure loggedIn state.
    if (!auth.loggedIn) {
      auth.loggedIn = true; auth.username = auth.username || 'dev';
    }
    if (to.name === 'login') return { name: 'dashboard' };
    return true;
  }
  if (to.meta.public) {
    // If already logged in and going to login, bounce to redirect or dashboard
    if (to.name === 'login' && auth.loggedIn) {
      const dest = to.query?.redirect || '/';
      return typeof dest === 'string' ? dest : { name: 'dashboard' };
    }
    return true;
  }
  if (!auth.loggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
