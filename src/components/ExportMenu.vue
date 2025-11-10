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
        <div class="border-t my-1"></div>
        <button @click="reset" class="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">Reset Database</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useProjectsStore } from '../stores/projects';
import { buildSnapshot, buildExportJSON, buildExportSQLiteSQL } from '../utils/export';
import { writeSnapshot, importSQLScript, initDB, resetDB } from '../utils/sqlite';

const store = useProjectsStore();
const open = ref(false);
const fileInput = ref(null);
const dropdownStyle = ref({ left: '0px', top: '0px' });
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

function onKeydown(e){ if (e.key === 'Escape' || e.key === 'Esc') { onEsc(e); } }
function onEsc(e){ e.preventDefault(); e.stopPropagation(); open.value = false; }
</script>
