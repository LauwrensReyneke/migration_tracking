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
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const username = ref('');
const password = ref('');

onMounted(() => { auth.init(); });

async function handleSubmit(){
  let ok = false;
  if (auth.needsBootstrapUser) ok = await auth.bootstrap(username.value, password.value);
  else ok = await auth.login(username.value, password.value);
  if (ok) router.replace({ name: 'dashboard' });
}
</script>
