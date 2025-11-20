<template>
  <div class="relative" data-export-menu-root @keydown="onKeydown">
    <button @click="toggle" class="text-sm px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Export</button>
    <Teleport to="body">
      <div v-if="open" class="fixed mt-2 z-[99999] w-56 bg-white border rounded shadow text-sm pointer-events-auto" :style="dropdownStyle">
        <button @click="exportJSON" class="w-full text-left px-3 py-2 hover:bg-gray-50">Download JSON</button>
        <button @click="exportSQL" class="w-full text-left px-3 py-2 hover:bg-gray-50">Download SQLite SQL</button>
        <div class="border-t my-1"></div>
        <button @click="triggerImport" class="w-full text-left px-3 py-2 hover:bg-gray-50">Import (JSON or .sql)</button>
        <input ref="fileInput" type="file" accept=".json,.sql,application/json,application/sql,text/plain" class="hidden" @change="onFile" />
        <button v-if="local" @click="openPasteModal" class="w-full text-left px-3 py-2 hover:bg-gray-50">Paste JSON (local)</button>
        <div class="border-t my-1"></div>
        <button @click="reset" class="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">Reset Database</button>
      </div>
    </Teleport>
    <Modal :open="pasteOpen" title="Paste JSON Snapshot" @close="closePaste">
      <div class="space-y-3">
        <p class="text-xs text-slate-600">Paste a previously exported JSON snapshot to replace the local database. This only affects your local dev storage.</p>
        <textarea v-model="pasteText" rows="10" class="w-full text-xs font-mono border rounded p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="{\n  \"version\": 1,\n  \"developers\": [\n    \"Dev A\"\n  ],\n  \"projects\": []\n}"></textarea>
        <div v-if="pasteError" class="text-xs text-rose-600">{{ pasteError }}</div>
      </div>
      <template #footer>
        <div class="flex justify-between items-center gap-2">
          <button @click="closePaste" class="px-3 py-1.5 text-xs rounded border bg-white hover:bg-slate-50">Cancel</button>
          <div class="flex gap-2">
            <button v-if="canLoadLast" @click="loadLast" class="px-3 py-1.5 text-xs rounded border bg-white hover:bg-slate-50" title="Load last pasted JSON from localStorage">Last</button>
            <button @click="applyPaste" :disabled="applyBusy" class="px-3 py-1.5 text-xs rounded border bg-blue-600 text-white disabled:opacity-50">{{ applyBusy ? 'Applying…' : 'Apply' }}</button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useProjectsStore } from '../stores/projects';
import { buildSnapshot, buildExportJSON, buildExportSQLiteSQL } from '../utils/export';
import { writeSnapshot, importSQLScript, initDB, resetDB, isLocalDev } from '../utils/sqlite';
import Modal from './Modal.vue';

const store = useProjectsStore();
const open = ref(false);
const fileInput = ref(null);
const dropdownStyle = ref({ left: '0px', top: '0px' });
const local = computed(()=>isLocalDev());
function toggle(){ open.value = !open.value; nextTick(updatePos); }

function updatePos(){
  try {
    const root = document.querySelector('[data-export-menu-root]');
    if (!root) return;
    const rect = root.getBoundingClientRect();
    dropdownStyle.value = { left: Math.round(rect.right - 224) + 'px', top: Math.round(rect.bottom + 8) + 'px' };
  } catch {}
}

function closeOnClickOutside(e){
  const inside = e.target.closest('[data-export-menu-root]');
  if (!inside) open.value = false;
}

onMounted(() => {
  document.addEventListener('click', closeOnClickOutside);
  window.addEventListener('resize', updatePos);
  window.addEventListener('scroll', updatePos, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnClickOutside);
  window.removeEventListener('resize', updatePos);
  window.removeEventListener('scroll', updatePos, true);
});

function download(content, filename, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp(){
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function exportJSON(){
  const snap = buildSnapshot(store);
  const content = buildExportJSON(snap);
  download(content, `migration_tracking_${timestamp()}.json`, 'application/json');
  open.value = false;
}

function exportSQL(){
  const snap = buildSnapshot(store);
  const content = buildExportSQLiteSQL(snap);
  download(content, `migration_tracking_${timestamp()}.sql`, 'application/sql');
  open.value = false;
}

function triggerImport(){ fileInput.value?.click(); }

async function onFile(e){
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const name = (file.name||'').toLowerCase();
  const text = await file.text();
  try {
    await initDB();
    if (name.endsWith('.sql')) {
      await importSQLScript(text);
    } else {
      const json = JSON.parse(text);
      await writeSnapshot(json);
    }
    window.location.reload();
  } catch (err) {
    console.error('Import failed:', err);
    alert('Import failed: ' + (err?.message || String(err)));
  } finally {
    e.target.value = '';
    open.value = false;
  }
}

async function reset(){
  if (!confirm('This will clear the in-browser database. Continue?')) return;
  await initDB();
  resetDB();
  window.location.reload();
}

// Paste JSON modal state
const pasteOpen = ref(false);
const pasteText = ref('');
const pasteError = ref(null);
const applyBusy = ref(false);
const LAST_PASTE_KEY = 'mt_last_paste_json_snapshot';
const canLoadLast = computed(()=> typeof localStorage !== 'undefined' && !!localStorage.getItem(LAST_PASTE_KEY));

function openPasteModal(){
  pasteOpen.value = true; pasteError.value = null; pasteText.value = '';
}
function closePaste(){ if (!applyBusy.value) { pasteOpen.value = false; pasteError.value = null; } }
function loadLast(){ try { pasteText.value = localStorage.getItem(LAST_PASTE_KEY) || ''; } catch {} }

async function applyPaste(){
  pasteError.value = null;
  let json;
  try {
    if (!pasteText.value.trim()) { pasteError.value = 'No JSON provided.'; return; }
    json = JSON.parse(pasteText.value);
    if (!json || typeof json !== 'object') { pasteError.value = 'Parsed value is not an object.'; return; }
    // Basic shape validation
    if (!Array.isArray(json.projects) || !Array.isArray(json.developers)) {
      pasteError.value = 'JSON must include projects[] and developers[].'; return;
    }
  } catch (e) {
    pasteError.value = 'Invalid JSON: ' + (e.message || String(e)); return;
  }
  applyBusy.value = true;
  try {
    await initDB();
    await writeSnapshot(json);
    try { localStorage.setItem(LAST_PASTE_KEY, pasteText.value); } catch {}
    window.location.reload();
  } catch (e) {
    pasteError.value = 'Apply failed: ' + (e.message || String(e));
  } finally {
    applyBusy.value = false;
  }
}

function onKeydown(e){ if (e.key === 'Escape' || e.key === 'Esc') { onEsc(e); } }
function onEsc(e){ e.preventDefault(); e.stopPropagation(); open.value = false; }
</script>
