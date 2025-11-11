<template>
  <div class="fixed bottom-4 right-4 z-50 max-w-sm text-xs font-mono bg-white shadow-lg border border-slate-300 rounded-md p-3 space-y-2">
    <div class="flex items-center justify-between">
      <strong class="text-slate-700">Env Debug</strong>
      <button @click="visible=false" class="px-1 py-0.5 text-[10px] border rounded hover:bg-slate-50">×</button>
    </div>
    <div v-if="!hasViteEnv" class="text-red-600">import.meta.env not available.</div>
    <table v-else class="w-full border-collapse">
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td class="pr-2 text-slate-500">{{ row.key }}</td>
          <td class="text-slate-800">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
    <div class="pt-1 border-t border-slate-200">
      <p class="text-slate-500">Token values are redacted (first 4 chars + length).</p>
      <p v-if="rowsTokenMissing.length" class="text-amber-600">Missing tokens: {{ rowsTokenMissing.join(', ') }} (redeploy after adding)</p>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
const visible = ref(true);
const env = import.meta?.env || {};
const redact = (v) => {
  if (!v) return '—';
  const s = String(v);
  if (s.length <= 4) return s + '…(' + s.length + ')';
  return s.slice(0,4) + '…(' + s.length + ')';
};
const keys = [
  'VITE_SQLITE_URL',
  'VITE_DB_WRITE_TOKEN',
  'VITE_BLOB_READ_WRITE_TOKEN',
  'VITE_SQLITE_PUT_URL',
  'VITE_DEBUG_DB',
  'VITE_DEBUG_ENV'
];
const rows = computed(()=> keys.map(k=>({ key: k, value: redact(env[k]) })));
const hasViteEnv = computed(()=> Object.keys(env).length > 0);
const rowsTokenMissing = computed(()=> ['VITE_DB_WRITE_TOKEN'].filter(k => !env[k]));
</script>
<style scoped>
 table td { padding: 2px 0; }
</style>

