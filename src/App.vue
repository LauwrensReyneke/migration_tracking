<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
    <!-- If not logged in: render router-view alone (login screen) -->
    <div v-if="!auth.loggedIn" class="min-h-screen">
      <router-view />
    </div>
    <div v-else class="min-h-screen flex">
      <!-- Mobile slide-over sidebar -->
      <transition name="fade-fast">
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 md:hidden">
          <div class="absolute inset-0 bg-black/30" @click="sidebarOpen = false"></div>
          <aside class="absolute inset-y-0 left-0 w-72 bg-white shadow-xl border-r border-slate-200 flex flex-col">
            <div class="relative h-14 px-4 flex items-center justify-start bg-black border-b border-black">
                <RouterLink to="/" class="inline-flex items-center">
                  <img src="/R-E-D_Logo.webp" alt="R-E-D Logo" class="h-6 w-auto" loading="eager" decoding="async" />
                </RouterLink>
              <button @click="sidebarOpen = false" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-white/10 text-white" aria-label="Close menu">✕</button>
            </div>
            <nav class="p-3 space-y-1 text-sm">
              <!-- Migration group (mobile) -->
              <div class="space-y-1">
                <div class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50">
                  <RouterLink :to="'/'" class="flex items-center gap-2 flex-1 min-w-0 text-slate-700" exact-active-class="!text-blue-700 font-medium">
                    <Fa icon="gauge" class="h-4 w-4 text-slate-400" />
                    <span class="truncate">Migration</span>
                  </RouterLink>
                  <button @click="toggleMigration()" :aria-expanded="migrationOpen.toString()" class="ml-2 p-1 rounded hover:bg-slate-100 text-slate-600">
                    <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': migrationOpen }" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M6.293 7.293a1 1 0 0 1 1.414 0L12 11.586l-4.293-4.293a1 1 0 0 1 0-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div v-show="migrationOpen" class="pl-9 space-y-1">
                  <RouterLink to="/projects" class="flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50" active-class="bg-blue-50 text-blue-700 font-medium">
                    <Fa icon="folder" class="h-4 w-4 text-slate-400" />
                    <span>Projects</span>
                  </RouterLink>
                  <RouterLink to="/developers" class="flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50" active-class="bg-blue-50 text-blue-700 font-medium">
                    <Fa icon="users" class="h-4 w-4 text-slate-400" />
                    <span>Developers</span>
                  </RouterLink>
                  <RouterLink to="/timeline" class="flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50" active-class="bg-blue-50 text-blue-700 font-medium">
                    <Fa icon="clock" class="h-4 w-4 text-slate-400" />
                    <span>Timeline</span>
                  </RouterLink>
                </div>
              </div>
            </nav>
            <!-- Profile bottom -->
            <div class="mt-auto p-3 border-t border-slate-200 text-xs flex items-center justify-between">
              <span class="font-medium text-slate-600 truncate" :title="auth.username">{{ auth.username }}</span>
              <button @click="logout" class="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50">Logout</button>
            </div>
          </aside>
        </div>
      </transition>

      <!-- Static sidebar for md+ (fixed) -->
      <aside class="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-white/80 backdrop-blur border-r border-slate-200/80 shadow-sm overflow-y-auto">
        <div class="h-14 px-4 flex items-center justify-start bg-black border-b border-black">
            <RouterLink to="/" class="inline-flex items-center">
              <img src="/R-E-D_Logo.webp" alt="R-E-D Logo" class="h-6 w-auto" loading="eager" decoding="async" />
            </RouterLink>
        </div>
        <nav class="p-3 space-y-1 text-sm">
          <!-- Migration group (desktop) -->
          <div class="space-y-1">
            <div class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50">
              <RouterLink :to="'/'" class="flex items-center gap-2 flex-1 min-w-0 text-slate-700" exact-active-class="!text-blue-700 font-medium">
                <Fa icon="gauge" class="h-4 w-4 text-slate-400" />
                <span class="truncate">Migration</span>
              </RouterLink>
              <button @click="toggleMigration()" :aria-expanded="migrationOpen.toString()" class="ml-2 p-1 rounded hover:bg-slate-100 text-slate-600">
                <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': migrationOpen }" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M6.293 7.293a1 1 0 0 1 1.414 0L12 11.586l-4.293-4.293a1 1 0 0 1 0-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <div v-show="migrationOpen" class="pl-9 space-y-1">
              <RouterLink to="/projects" class="flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50" active-class="bg-blue-50 text-blue-700 font-medium">
                <Fa icon="folder" class="h-4 w-4 text-slate-400" />
                <span>Projects</span>
              </RouterLink>
              <RouterLink to="/developers" class="flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50" active-class="bg-blue-50 text-blue-700 font-medium">
                <Fa icon="users" class="h-4 w-4 text-slate-400" />
                <span>Developers</span>
              </RouterLink>
              <RouterLink to="/timeline" class="flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50" active-class="bg-blue-50 text-blue-700 font-medium">
                <Fa icon="clock" class="h-4 w-4 text-slate-400" />
                <span>Timeline</span>
              </RouterLink>
            </div>
          </div>
        </nav>
        <!-- Profile bottom -->
        <div class="mt-auto p-4 border-t border-slate-200/80 text-xs flex items-center justify-between">
          <span class="font-medium text-slate-600 truncate" :title="auth.username">{{ auth.username }}</span>
          <button @click="logout" class="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50">Logout</button>
        </div>
      </aside>

      <!-- Main column -->
      <div class="flex-1 flex flex-col min-w-0 md:ml-64">
        <!-- Top bar -->
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200/80 shadow-sm">
          <div class="px-4 min-h-14 flex items-center justify-between gap-4 w-full">
            <!-- Left group: hamburger (mobile) + title -->
            <div class="flex items-center gap-2 min-w-0">
              <button @click="sidebarOpen = true" class="md:hidden p-2 rounded hover:bg-slate-100 border border-slate-200 text-slate-700" aria-label="Open menu">☰</button>
              <h2 class="text-base md:text-lg font-semibold text-slate-900 truncate min-w-0 max-w-[65vw] md:max-w-[40vw]">{{ pageTitle }}</h2>
            </div>
            <!-- Right: actions grow to fill remaining space, right-aligned -->
            <div id="header-actions" class="flex flex-1 justify-end items-center gap-2 flex-wrap min-w-0"></div>
          </div>
        </header>

        <main class="flex-1">
          <router-view v-slot="{ Component }">
            <transition name="fade-fast" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
        <EnvDebug v-if="showEnvDebug" />
        <footer class="text-center text-xs py-4 text-gray-400">&copy; 2025 Lauwrens Reyneke | CTO</footer>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import EnvDebug from './components/EnvDebug.vue';

const auth = useAuthStore();
const router = useRouter();

const sidebarOpen = ref(false);
// Navigation collapsed state for Migration group
const migrationOpen = ref(true);

const route = useRoute();
watch(() => route.fullPath, () => { sidebarOpen.value = false; });

// Open group when navigating within Migration area
const groupNames = new Set(['dashboard','projects','developers','timeline','devDetail']);
watch(() => route.name, (n) => {
  if (groupNames.has(n)) migrationOpen.value = true;
}, { immediate: true });

function toggleMigration(){ migrationOpen.value = !migrationOpen.value; }

const pageTitle = computed(() => {
  switch(route.name){
    case 'dashboard': return 'Dashboard';
    case 'projects': return 'Projects';
    case 'developers': return 'Developers';
    case 'timeline': return 'Timeline';
    case 'devDetail': return `Developer: ${route.params.dev}`;
    case 'login': return 'Login';
    default: return 'R-E-D | Migration Tracking';
  }
});
// Sync document.title with site title + page title
watch(pageTitle, (t) => { if (t) document.title = `R-E-D | Migration Tracking | ${t}`; }, { immediate: true });

function logout(){
  auth.logout();
  router.replace({ name: 'login' });
}

const showEnvDebug = computed(()=>{
  try { return new URL(window.location.href).searchParams.get('env') === '1'; } catch { return false; }
});
if (import.meta?.env?.VITE_DEBUG_ENV === '1') {
  const env = import.meta?.env || {};
  const redact = (v) => v ? String(v).slice(0,4)+'…('+String(v).length+')' : '—';
  console.log('[env] boot', {
    VITE_SQLITE_URL: redact(env.VITE_SQLITE_URL),
    VITE_DEBUG_DB: env.VITE_DEBUG_DB,
    VITE_DEBUG_ENV: env.VITE_DEBUG_ENV
  });
}
</script>
<style>
.fade-fast-enter-active,.fade-fast-leave-active{ transition: opacity .15s ease; }
.fade-fast-enter-from,.fade-fast-leave-to{ opacity: 0; }
.no-scrollbar::-webkit-scrollbar{ display:none; }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
.header-actions-scroll{ overscroll-behavior-x:contain; contain:layout paint; max-width:100%; }
</style>
