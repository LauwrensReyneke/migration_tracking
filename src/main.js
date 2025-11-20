import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import App from './App.vue';
import './assets/tailwind.css';
import { initDB, readSnapshot, writeSnapshot, importSQLScript } from './utils/sqlite';
import { useProjectsStore } from './stores/projects';
import { buildSnapshot } from './utils/export';
import { useAuthStore } from './stores/auth';
import { isLocalDev } from './utils/sqlite';
// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faListUl, faCircleCheck, faPercent, faCalendarDays, faGauge, faBolt, faTriangleExclamation, faUsers, faClock, faFolder } from '@fortawesome/free-solid-svg-icons';
import VueApexCharts from 'vue3-apexcharts';

library.add(faListUl, faCircleCheck, faPercent, faCalendarDays, faGauge, faBolt, faTriangleExclamation, faUsers, faClock, faFolder);

(async () => {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);
  app.use(VueApexCharts); // Register VueApexCharts globally
  app.component('Fa', FontAwesomeIcon);

  await initDB();
  const store = useProjectsStore();
  const auth = useAuthStore();
  if (isLocalDev()) {
    auth.loggedIn = true; auth.username = 'dev'; auth.ready = true;
  } else {
    await auth.init();
  }

  async function hydrateIfNeeded(){
    if (!auth.loggedIn) return;
    let snap = await readSnapshot();
    let hasData = (snap.developers && snap.developers.length) || (snap.projects && snap.projects.length);

    try {
      if (hasData) {
        store.hydrateFromSnapshot(snap);
      } else {
        // Try one-time migration from legacy JSON localStorage
        let seeded = false;
        try {
          if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('migrationTrackingData_v1');
            if (raw) {
              const legacy = JSON.parse(raw);
              if (legacy && (Array.isArray(legacy.projects) || Array.isArray(legacy.developers))) {
                store.hydrateFromSnapshot({
                  developers: Array.isArray(legacy.developers) ? legacy.developers : [],
                  wipLimits: legacy.wipLimits || {},
                  projects: Array.isArray(legacy.projects) ? legacy.projects : [],
                  targetAllCompletionDate: legacy.targetAllCompletionDate || undefined
                });
                await writeSnapshot(buildSnapshot(store));
                localStorage.removeItem('migrationTrackingData_v1');
                seeded = true;
              }
            }
          }
        } catch {}

        if (!seeded) {
          // Try auto-import a seed SQL if provided
          try {
            const seedPath = import.meta.env?.VITE_SEED_SQL || '/seed.sql';
            const res = await fetch(seedPath, { cache: 'no-store' });
            if (res.ok) {
              const sqlText = await res.text();
              if (/INSERT\s+INTO\s+projects|CREATE\s+TABLE\s+projects/i.test(sqlText)) {
                await importSQLScript(sqlText);
                // reload to pick up the new DB content
                window.location.reload();
                return;
              }
            }
          } catch {}
          // Otherwise write current empty defaults
          await writeSnapshot(buildSnapshot(store));
        }
      }
    } catch (e) {
      try { await writeSnapshot(buildSnapshot(store)); } catch {}
    }
  }

  // Hydrate immediately if already logged in (e.g., persisted session later upgrade) else wait until login
  if (auth.loggedIn) await hydrateIfNeeded();

  // Watch for login navigation to hydrate
  router.afterEach(async (to) => {
    if (to.name !== 'login') await hydrateIfNeeded();
  });

  app.mount('#app');
})();
