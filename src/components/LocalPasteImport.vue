<template>
  <div v-if="local" class="relative inline-flex items-center">
    <button @click="openModal" class="text-xs px-2.5 py-1.5 rounded border bg-white hover:bg-slate-50 shadow-sm">Paste JSON</button>
    <Modal :open="open" title="Paste JSON Snapshot" @close="closeModal">
      <div class="space-y-3">
        <p class="text-xs text-slate-600">Paste a previously exported JSON snapshot to replace the local database. Only affects your local dev storage.</p>
        <textarea v-model="text" rows="10" class="w-full text-xs font-mono border rounded p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder='{"version":1,"developers":["Dev A"],"projects":[]}'></textarea>
        <div v-if="error" class="text-xs text-rose-600">{{ error }}</div>
      </div>
      <template #footer>
        <div class="flex justify-between items-center gap-2">
          <button @click="closeModal" class="px-3 py-1.5 text-xs rounded border bg-white hover:bg-slate-50">Cancel</button>
          <div class="flex gap-2">
            <button v-if="canLoadLast" @click="loadLast" class="px-3 py-1.5 text-xs rounded border bg-white hover:bg-slate-50" title="Load last pasted JSON">Last</button>
            <button @click="apply" :disabled="busy" class="px-3 py-1.5 text-xs rounded border bg-blue-600 text-white disabled:opacity-50">{{ busy ? 'Applying…' : 'Apply' }}</button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
import Modal from './Modal.vue';
import { isLocalDev, initDB, writeSnapshot } from '../utils/sqlite';

const local = computed(() => isLocalDev());
const open = ref(false);
const text = ref('');
const error = ref(null);
const busy = ref(false);
const LAST_KEY = 'mt_last_paste_json_snapshot';
const canLoadLast = computed(() => typeof localStorage !== 'undefined' && !!localStorage.getItem(LAST_KEY));

function openModal(){ open.value = true; error.value = null; text.value=''; }
function closeModal(){ if (!busy.value) { open.value=false; error.value=null; } }
function loadLast(){ try { text.value = localStorage.getItem(LAST_KEY) || ''; } catch {} }

async function apply(){
  error.value = null;
  let json;
  try {
    if (!text.value.trim()) { error.value='No JSON provided.'; return; }
    json = JSON.parse(text.value);
    if (!json || typeof json !== 'object') { error.value='Parsed value not an object.'; return; }
    if (!Array.isArray(json.projects) || !Array.isArray(json.developers)) { error.value='JSON must include projects[] and developers[].'; return; }
  } catch (e) {
    error.value = 'Invalid JSON: ' + (e.message||String(e)); return;
  }
  busy.value = true;
  try {
    await initDB();
    await writeSnapshot(json);
    try { localStorage.setItem(LAST_KEY, text.value); } catch {}
    window.location.reload();
  } catch (e) {
    error.value = 'Apply failed: ' + (e.message||String(e));
  } finally {
    busy.value=false;
  }
}
</script>
