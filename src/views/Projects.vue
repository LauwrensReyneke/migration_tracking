<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8">
    <Teleport to="#header-actions">
      <div class="flex items-center gap-3 w-full min-w-0">
        <!-- Header filters: visible only on 2xl+ -->
        <div class="hidden 2xl:flex items-center gap-3 w-full">
          <input v-model="filters.search" placeholder="Search projects" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          <select v-model="filters.type" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="all">All Types</option>
            <option value="migration">Migration</option>
            <option value="newbuild">New Build</option>
          </select>
          <select v-model="filters.dev" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="all">All Devs</option>
            <option v-for="d in developers" :key="d" :value="d">{{ d }}</option>
          </select>
          <select v-model="filters.stage" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="all">All Stages</option>
            <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="filters.sortBy" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="filters.sortDir" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <label class="text-xs font-medium select-none text-slate-600"><input type="checkbox" v-model="filters.onlyActive" class="mr-1 align-middle accent-blue-600"> Active only</label>
          <button @click="clearFilters" class="text-sm px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-sm">Clear</button>
          <div class="ml-auto"></div>
          <button @click="openAddModal" class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm">
            <PlusIcon class="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        <!-- Placeholder for chips or counts if needed -->
      </div>
    </Teleport>

    <!-- Filters panel for <2xl screens -->
    <div class="2xl:hidden bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-center gap-2">
        <input v-model="filters.search" placeholder="Search projects" class="flex-1 min-w-[140px] border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
        <select v-model="filters.type" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="all">All Types</option>
          <option value="migration">Migration</option>
          <option value="newbuild">New Build</option>
        </select>
        <select v-model="filters.dev" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="all">All Devs</option>
          <option v-for="d in developers" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filters.stage" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="all">All Stages</option>
          <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="filters.sortBy" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <select v-model="filters.sortDir" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <label class="text-xs font-medium select-none text-slate-600"><input type="checkbox" v-model="filters.onlyActive" class="mr-1 align-middle accent-blue-600"> Active only</label>
        <button @click="clearFilters" class="text-sm px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-sm">Clear</button>
        <button @click="openAddModal" class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm">
          <PlusIcon class="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>
    </div>

    <!-- Projects table -->
    <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
      <h3 class="font-medium mb-3 text-slate-800">All Projects</h3>
      <table class="w-full text-sm">
        <thead class="text-xs text-slate-500 text-left">
          <tr>
            <th class="py-1">Name</th>
            <th class="py-1">Type</th>
            <th class="py-1">Dev</th>
            <th class="py-1">Stage</th>
            <th class="py-1">Target Days</th>
            <th class="py-1">Started</th>
            <th class="py-1">Completed</th>
            <th class="py-1 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredProjects" :key="p.id" class="border-t align-top group hover:bg-slate-50/60">
            <template v-if="editRowId === p.id">
              <td class="py-1 pr-2"><input v-model="editForm.name" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" /></td>
              <td class="py-1 pr-2">
                <select v-model="editForm.type" class="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5">
                  <option value="migration">Migration</option>
                  <option value="newbuild">New Build</option>
                </select>
              </td>
              <td class="py-1 pr-2">
                <select v-model="editForm.assignedDev" class="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5">
                  <option v-for="d in developers" :key="d" :value="d">{{ d }}</option>
                </select>
              </td>
              <td class="py-1 pr-2">
                <select v-model="editForm.stage" class="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5">
                  <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
              <td class="py-1 pr-2 w-24"><input type="number" min="1" v-model.number="editForm.targetDays" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></td>
              <td class="py-1 pr-2 text-xs">
                <input type="date" v-model="editForm.startedAtDate" class="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
              </td>
              <td class="py-1 pr-2 text-xs">
                <template v-if="editForm.stage === 'production' || editForm.stage === 'canceled'">
                  <input type="date" v-model="editForm.completedAtDate" class="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                </template>
                <template v-else>
                  {{ editForm.completedAt?.slice(0,10) || '-' }}
                </template>
              </td>
              <td class="py-1 pr-2 text-right space-x-1">
                <button @click="saveEdit(p.id)" class="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">Save</button>
                <button @click="cancelEdit" class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50">Cancel</button>
              </td>
            </template>
            <template v-else>
              <td class="py-1 pr-2">{{ p.name }}</td>
              <td class="py-1 pr-2"><TypeBadge :type="p.type" /></td>
              <td class="py-1 pr-2">{{ p.assignedDev }}</td>
              <td class="py-1 pr-2">{{ p.stage }}</td>
              <td class="py-1 pr-2">{{ p.targetDays }}</td>
              <td class="py-1 pr-2">{{ p.startedAt?.slice(0,10) || '-' }}</td>
              <td class="py-1 pr-2">{{ p.completedAt?.slice(0,10) || '-' }}</td>
              <td class="py-1 pr-2 text-right">
                <div class="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button @click="beginEdit(p)" type="button" title="Edit" class="icon-btn text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                    <PencilSquareIcon class="w-5 h-5" />
                    <span class="sr-only">Edit</span>
                  </button>
                  <button @click="deleteProject(p.id)" type="button" title="Delete" class="icon-btn text-red-600 hover:bg-red-50 hover:text-red-700">
                    <TrashIcon class="w-5 h-5" />
                    <span class="sr-only">Delete</span>
                  </button>
                </div>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Project Modal (shared) -->
    <Modal :open="showAddModal" title="Add Project" @close="closeAddModal">
      <ProjectAddForm @done="onAdded" @cancel="closeAddModal" />
    </Modal>
  </div>
</template>
<script setup>
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '../stores/projects';
import TypeBadge from '../components/partials/TypeBadge.vue';
import { STAGES } from '../stores/projects';
import Modal from '../components/Modal.vue';
import ProjectAddForm from '../components/ProjectAddForm.vue';
import { PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/vue/24/outline';

const store = useProjectsStore();
const { developers, projects } = storeToRefs(store);
const editRowId = ref(null);
const editForm = reactive({});

// Filters
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'assignedDev', label: 'Developer' },
  { value: 'stage', label: 'Stage' },
  { value: 'targetDays', label: 'Target Days' },
  { value: 'startedAt', label: 'Started' },
  { value: 'completedAt', label: 'Completed' }
];
const filters = reactive({ search: '', type: 'all', dev: 'all', stage: 'all', onlyActive: false, sortBy: 'startedAt', sortDir: 'desc' });
const filteredProjects = computed(() => {
  const q = filters.search.trim().toLowerCase();
  const list = projects.value.filter(p => {
    if (filters.onlyActive && (p.stage === 'production' || p.stage === 'canceled')) return false;
    if (filters.type !== 'all' && p.type !== filters.type) return false;
    if (filters.dev !== 'all' && p.assignedDev !== filters.dev) return false;
    if (filters.stage !== 'all' && p.stage !== filters.stage) return false;
    if (q && !(p.name || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const by = filters.sortBy;
  const dir = filters.sortDir === 'desc' ? -1 : 1;
  const getVal = (p) => {
    if (by === 'targetDays') return typeof p.targetDays === 'number' ? p.targetDays : null;
    if (by === 'startedAt' || by === 'completedAt' || by === 'createdAt') return p[by] ? Date.parse(p[by]) : null;
    if (by === 'assignedDev' || by === 'name' || by === 'type' || by === 'stage') return (p[by] || '').toString().toLowerCase();
    return null;
  };
  return list.slice().sort((a,b) => {
    const av = getVal(a);
    const bv = getVal(b);
    const aNull = av === null || av === undefined || av === '' || Number.isNaN(av);
    const bNull = bv === null || bv === undefined || bv === '' || Number.isNaN(bv);
    if (aNull && bNull) return 0;
    if (aNull) return 1; // nulls last
    if (bNull) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return av === bv ? 0 : (av < bv ? -1 : 1) * dir;
    // string compare
    return av.toString().localeCompare(bv.toString()) * dir;
  });
});
function clearFilters(){
  filters.search=''; filters.type='all'; filters.dev='all'; filters.stage='all'; filters.onlyActive=false; filters.sortBy='createdAt'; filters.sortDir='desc';
}

// Modal controls
const showAddModal = ref(false);
function openAddModal(){ showAddModal.value = true; }
function closeAddModal(){ showAddModal.value = false; }
function onAdded(){ closeAddModal(); }

// Prevent background scroll when modal open
watch(showAddModal, (open) => {
  if (typeof document !== 'undefined') {
    if (open) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
  }
});
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.classList.remove('overflow-hidden');
});

function beginEdit(p){
  editRowId.value = p.id;
  Object.assign(editForm, JSON.parse(JSON.stringify(p)));
  editForm.startedAtDate = editForm.startedAt ? editForm.startedAt.slice(0,10) : '';
  editForm.completedAtDate = editForm.completedAt ? editForm.completedAt.slice(0,10) : '';
}
function cancelEdit(){ editRowId.value = null; Object.keys(editForm).forEach(k=>delete editForm[k]); }
function saveEdit(id){
  const patch = { ...editForm };
  // started date
  if (patch.startedAtDate !== undefined) {
    if (patch.startedAtDate) {
      const sp = patch.startedAtDate.split('-');
      if (sp.length === 3) {
        const d = new Date(Number(sp[0]), Number(sp[1]) - 1, Number(sp[2]), 12, 0, 0);
        if (!isNaN(d.getTime())) patch.startedAt = d.toISOString();
      }
    } else patch.startedAt = null;
    delete patch.startedAtDate;
  }
  // completed date (only if stage is terminal)
  if (patch.completedAtDate !== undefined) {
    if ((patch.stage === 'production' || patch.stage === 'canceled') && patch.completedAtDate) {
      const cp = patch.completedAtDate.split('-');
      if (cp.length === 3) {
        const d = new Date(Number(cp[0]), Number(cp[1]) - 1, Number(cp[2]), 12, 0, 0);
        if (!isNaN(d.getTime())) patch.completedAt = d.toISOString();
      }
    } else if (patch.stage === 'production' || patch.stage === 'canceled') {
      // allow clearing -> will be re-set automatically if stage stays terminal
      patch.completedAt = null;
    }
    delete patch.completedAtDate;
  }
  // basic validation: completed cannot be before started
  if (patch.startedAt && patch.completedAt && new Date(patch.completedAt) < new Date(patch.startedAt)) {
    alert('Completed date cannot be before Started date');
    return;
  }
  store.updateProject(id, patch);
  cancelEdit();
}
function deleteProject(id){
  if (confirm('Delete this project?')) store.deleteProject(id);
  if (editRowId.value === id) cancelEdit();
}

// UI state: mobile filters popover
const filtersOpen = ref(false);
</script>

<style scoped>
.icon-btn { @apply inline-flex items-center justify-center w-8 h-8 rounded-md transition text-sm font-medium; }
</style>
