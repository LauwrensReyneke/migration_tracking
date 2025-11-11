<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
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
              <h1 class="font-semibold text-lg text-slate-900">
                <RouterLink to="/" class="inline-flex items-center">
                  <img src="/R-E-D_Logo.webp" alt="R-E-D Logo" class="h-6 w-auto" loading="eager" decoding="async" />
                </RouterLink>
              </h1>
              <button @click="sidebarOpen = false" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-white/10 text-white" aria-label="Close menu">✕</button>
            </div>
            <nav class="p-3 space-y-1 text-sm">
              <RouterLink v-for="item in nav" :key="item.to" :to="item.to"
                class="block px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50"
                active-class="bg-blue-50 text-blue-700 font-medium">
                {{ item.label }}
              </RouterLink>
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
          <h1 class="font-semibold text-lg text-slate-900">
            <RouterLink to="/" class="inline-flex items-center">
              <img src="/R-E-D_Logo.webp" alt="R-E-D Logo" class="h-6 w-auto" loading="eager" decoding="async" />
            </RouterLink>
          </h1>
        </div>
        <nav class="p-3 space-y-1 text-sm">
          <RouterLink v-for="item in nav" :key="item.to" :to="item.to"
            class="block px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50"
            active-class="bg-blue-50 text-blue-700 font-medium">
            {{ item.label }}
          </RouterLink>
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
          <div class="px-4 h-14 flex items-center gap-3">
            <button @click="sidebarOpen = true" class="md:hidden p-2 rounded hover:bg-slate-100 border border-slate-200 text-slate-700" aria-label="Open menu">☰</button>
            <h2 class="text-base md:text-lg font-semibold text-slate-900 truncate">{{ pageTitle }}</h2>
            <div class="ml-auto flex items-center gap-2 min-w-0">
              <!-- Teleport target for per-view header controls -->
              <div id="header-actions" class="flex items-center gap-2 overflow-x-auto overflow-y-visible whitespace-nowrap pr-2 h-10 py-1"></div>
            </div>
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
import { useStorage } from '@vueuse/core';
import { useAuthStore } from './stores/auth';
import EnvDebug from './components/EnvDebug.vue';

const auth = useAuthStore();
const router = useRouter();

const sidebarOpen = ref(false);
const nav = [
  { to: '/', label: 'Migration Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/developers', label: 'Developers' },
  { to: '/timeline', label: 'Timeline' },
];

const route = useRoute();
watch(() => route.fullPath, () => { sidebarOpen.value = false; });

const pageTitle = computed(() => {
  switch(route.name){
    case 'dashboard': return 'Dashboard';
    case 'projects': return 'Projects';
    case 'developers': return 'Developers';
    case 'timeline': return 'Timeline';
    case 'devDetail': return `Developer: ${route.params.dev}`;
    case 'login': return 'Login';
    default: return 'Bob Sites';
  }
});
// Sync document.title with site title + page title
watch(pageTitle, (t) => { if (t) document.title = `Bob Sites — ${t}`; }, { immediate: true });

const showSparklines = useStorage('pref_show_sparklines', true);

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
</style>
