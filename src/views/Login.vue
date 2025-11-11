<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6">
    <div class="w-full max-w-sm bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h1 class="text-lg font-semibold text-slate-900 mb-4">Sign in</h1>

      <div v-if="auth.loading" class="text-sm text-slate-500 mb-2">Loading…</div>
      <div v-if="auth.error" class="text-sm text-rose-600 mb-2">{{ auth.error }}</div>

      <form @submit.prevent="handleSubmit" class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Username</label>
          <input v-model="username" type="text" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 text-sm font-medium">{{ auth.needsBootstrapUser ? 'Create Admin & Sign in' : 'Sign in' }}</button>
      </form>

      <p v-if="auth.needsBootstrapUser" class="mt-3 text-xs text-slate-500">No users found. Create the first admin user.</p>

      <div v-if="showDebug" class="mt-4 border-t pt-3">
        <div class="text-[11px] text-slate-500 mb-2">Debug (DB as source of truth)</div>
        <div class="text-xs text-slate-700 mb-2">
          <div>Users in DB: <strong>{{ debug.userCount }}</strong></div>
          <div v-if="debug.usernames.length">Usernames: <span class="font-mono">{{ debug.usernames.join(', ') }}</span></div>
          <div v-if="debug.error" class="text-rose-600">{{ debug.error }}</div>
        </div>
        <div class="flex gap-2">
          <button @click="refreshDebug" :disabled="debug.busy" class="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50">Refresh</button>
          <button @click="resetUsersTable" :disabled="debug.busy" class="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50">Reset Users</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserCount, listUsernames, resetUsers } from '../utils/sqlite';

const auth = useAuthStore();
const router = useRouter();
const username = ref('');
const password = ref('');

const showDebug = ref(false);
const debug = ref({ userCount: null, usernames: [], error: null, busy: false });

onMounted(async () => {
  await auth.init();
  try {
    const params = new URLSearchParams(window.location.search);
    showDebug.value = params.get('debug') === '1';
  } catch {}
  if (showDebug.value) await refreshDebug();
});

async function refreshDebug(){
  debug.value.busy = true; debug.value.error = null;
  try {
    const c = await getUserCount();
    debug.value.userCount = c;
    debug.value.usernames = c > 0 ? await listUsernames() : [];
  } catch (e) {
    debug.value.error = e.message || String(e);
  } finally { debug.value.busy = false; }
}

async function resetUsersTable(){
  debug.value.busy = true; debug.value.error = null;
  try {
    await resetUsers();
    await auth.init();
    auth.needsBootstrapUser = true;
    debug.value.userCount = 0; debug.value.usernames = [];
  } catch (e) {
    debug.value.error = e.message || String(e);
  } finally { debug.value.busy = false; }
}

async function handleSubmit(){
  let ok = false;
  if (auth.needsBootstrapUser) ok = await auth.bootstrap(username.value, password.value);
  else ok = await auth.login(username.value, password.value);
  if (ok) router.replace({ name: 'dashboard' });
}
</script>
