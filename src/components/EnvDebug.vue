<template>
  <div class="fixed bottom-4 right-4 z-50 max-w-sm text-xs font-mono bg-white shadow-lg border border-slate-300 rounded-md p-3 space-y-2" v-if="visible">
    <div class="flex items-center justify-between">
      <strong class="text-slate-700">Env Debug</strong>
      <div class="flex items-center gap-1">
        <button @click="runDryRun" class="px-2 py-0.5 text-[10px] border rounded bg-blue-50 hover:bg-blue-100 text-blue-700" :disabled="testing">{{ testing ? 'Testing…' : 'PUT Dry Run' }}</button>
        <button @click="visible=false" class="px-1 py-0.5 text-[10px] border rounded hover:bg-slate-50">×</button>
      </div>
    </div>
    <table class="w-full border-collapse">
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td class="pr-2 text-slate-500">{{ row.key }}</td>
          <td class="text-slate-800">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
    <div class="pt-1 border-t border-slate-200 space-y-1">
      <div>Endpoint: <code>/api/db</code></div>
      <div v-if="testStatus" class="mt-1">
        <p :class="testStatusClass">Dry Run: {{ testStatus }}</p>
        <p v-if="testDetail" class="text-slate-500 truncate" :title="testDetail">{{ testDetail }}</p>
      </div>
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
  'VITE_DEBUG_DB',
  'VITE_DEBUG_ENV'
];
const rows = computed(()=> keys.map(k=>({ key: k, value: redact(env[k]) })));
const testing = ref(false);
const testStatus = ref('');
const testDetail = ref('');
const testStatusClass = computed(()=> testStatus.value.includes('OK') ? 'text-green-600' : testStatus.value.includes('Unauthorized') ? 'text-red-600' : 'text-slate-600');

async function runDryRun(){
  testing.value = true; testStatus.value=''; testDetail.value='';
  try {
    const url = '/api/db?dry=1&debug=1';
    const res = await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/octet-stream' }, body: new Uint8Array([0]) });
    const text = await res.text();
    testStatus.value = res.status === 200 ? 'OK ('+res.status+')' : 'Failed ('+res.status+')';
    testDetail.value = text.slice(0,300);
  } catch (e){ testStatus.value = 'Error'; testDetail.value = String(e.message||e); }
  finally { testing.value = false; }
}

try { window.__MT_ENV = { sqliteUrl: env.VITE_SQLITE_URL || null }; } catch {}
</script>
<style scoped>
 table td { padding: 2px 0; }
</style>
