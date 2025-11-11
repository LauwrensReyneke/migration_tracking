<template>
  <div class="fixed bottom-4 right-4 z-50 max-w-sm text-xs font-mono bg-white shadow-lg border border-slate-300 rounded-md p-3 space-y-2" v-if="visible">
    <div class="flex items-center justify-between">
      <strong class="text-slate-700">Env Debug</strong>
      <div class="flex items-center gap-1">
        <button v-if="hasToken" @click="runDryRun" class="px-2 py-0.5 text-[10px] border rounded bg-blue-50 hover:bg-blue-100 text-blue-700" :disabled="testing">{{ testing ? 'Testing…' : 'Auth Test' }}</button>
        <button @click="visible=false" class="px-1 py-0.5 text-[10px] border rounded hover:bg-slate-50">×</button>
      </div>
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
    <div class="pt-1 border-t border-slate-200 space-y-1">
      <p class="text-slate-500">Token values are redacted (first 4 chars + length).</p>
      <p v-if="rowsTokenMissing.length" class="text-amber-600">Missing tokens: {{ rowsTokenMissing.join(', ') }} (redeploy after adding)</p>
      <div v-if="testStatus" class="mt-1">
        <p :class="testStatusClass">Auth Dry Run: {{ testStatus }}</p>
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
  'VITE_DB_WRITE_TOKEN',
  'VITE_BLOB_READ_WRITE_TOKEN',
  'VITE_SQLITE_PUT_URL',
  'VITE_DEBUG_DB',
  'VITE_DEBUG_ENV'
];
const rows = computed(()=> keys.map(k=>({ key: k, value: redact(env[k]) })));
const hasViteEnv = computed(()=> Object.keys(env).length > 0);
const rowsTokenMissing = computed(()=> ['VITE_DB_WRITE_TOKEN'].filter(k => !env[k]));
const fullToken = env.VITE_DB_WRITE_TOKEN || env.VITE_BLOB_READ_WRITE_TOKEN || '';
const hasToken = computed(()=> !!fullToken);
const testing = ref(false);
const testStatus = ref('');
const testDetail = ref('');
const testStatusClass = computed(()=> testStatus.value.includes('OK') ? 'text-green-600' : testStatus.value.includes('Unauthorized') ? 'text-red-600' : 'text-slate-600');

async function runDryRun(){
  testing.value = true; testStatus.value=''; testDetail.value='';
  try {
    const auth = /^Bearer\s+/i.test(fullToken) ? fullToken : `Bearer ${fullToken}`;
    const url = '/api/db/update?dry=1&debug=1';
    const res = await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/octet-stream', Authorization: auth }, body: new Uint8Array([0]) });
    const text = await res.text();
    testStatus.value = res.status === 200 ? 'OK ('+res.status+')' : 'Failed ('+res.status+')';
    testDetail.value = text.slice(0,300);
  } catch (e){ testStatus.value = 'Error'; testDetail.value = String(e.message||e); }
  finally { testing.value = false; }
}

// Expose redacted + presence info globally for console debugging (no full token leak)
try { window.__MT_ENV = { hasToken: !!fullToken, tokenRedacted: redact(fullToken), sqliteUrl: env.VITE_SQLITE_URL || null }; } catch {}
</script>
<style scoped>
 table td { padding: 2px 0; }
</style>
