<template>
  <div>
    <div v-if="!auth.loggedIn" class="p-6 text-slate-500">Please sign in to view this page.</div>
    <div v-else>
      <div class="max-w-7xl mx-auto p-6 space-y-8">
        <Teleport to="#header-actions">
          <div class="flex items-center gap-3 w-full">
            <span v-if="developers.length" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">Total: {{ developers.length }}</span>
            <button @click="openAddModal" class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm">
              <UserPlusIcon class="w-4 h-4" />
              <span>Add Dev</span>
            </button>
          </div>
        </Teleport>

        <!-- Active Developers Grid -->
        <div class="space-y-4">
          <div
            v-if="developers.length"
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <div
              v-for="d in developers"
              :key="d"
              class="group relative rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition ring-1 ring-transparent hover:ring-slate-200 hover:z-50"
            >
              <!-- Action buttons -->
              <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                <template v-if="renameTarget === d">
                  <button @click="saveRename(d)" type="button" title="Save" class="icon-btn text-emerald-600 hover:bg-emerald-50">
                    <CheckIcon class="w-5 h-5" />
                  </button>
                  <button @click="cancelRename" type="button" title="Cancel" class="icon-btn text-slate-500 hover:bg-slate-100">
                    <XMarkIcon class="w-5 h-5" />
                  </button>
                </template>
                <template v-else>
                  <button @click="beginRename(d)" type="button" title="Rename" class="icon-btn text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                    <PencilSquareIcon class="w-5 h-5" />
                  </button>
                  <button @click="remove(d)" type="button" title="Remove" class="icon-btn text-red-600 hover:bg-red-50 hover:text-red-700">
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </template>
              </div>

              <!-- Name / rename -->
              <div class="mb-4 pr-10">
                <template v-if="renameTarget === d">
                  <input
                    ref="renameInputRef"
                    v-model.trim="renameValue"
                    class="w-full bg-white/90 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-lg px-3 py-2 text-sm font-medium text-slate-900"
                    @keyup.enter="saveRename(d)"
                    @keyup.esc="cancelRename"
                  />
                </template>
                <template v-else>
                  <RouterLink
                    :to="{ name: 'devDetail', params: { dev: d } }"
                    class="flex items-center gap-2 min-w-0 rounded-lg -mx-1 px-1 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    :aria-label="`View ${d}`"
                    :title="`View ${d}`"
                  >
                    <DevProfile :name="d" :size="30" :showText="true" :nameClass="'text-sm font-semibold tracking-tight text-slate-900 group-hover:text-blue-700'" :wrapperClass="'flex items-center gap-2 min-w-0'" />
                  </RouterLink>
                </template>
              </div>

              <!-- Metrics chips -->
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <span class="w-2 h-2 rounded-full" :class="(workloadByDev[d]||0) > (wipLimits[d]||Infinity) ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'"></span>
                  Active: {{ workloadByDev[d] || 0 }}
                </span>
                <span v-if="wipLimits[d]" class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">WIP {{ wipLimits[d] }}</span>
              </div>

              <!-- Sparkline + label -->
              <div class="mt-1">
                <Sparkline :data="devSparkMA7[d]" :color="devSparkColor(d)" :w="100" :h="24" :stroke-width="2" />
                <div v-if="devSparkRawRecent[d] && devSparkRawRecent[d].length" class="mt-1 text-[10px] text-slate-500 flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full" :class="devSparkColorClass(d)"></span>
                  <span>7d MA · Completions</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 bg-white/50">
            No developers yet. Click <span class="font-medium text-slate-700">Add Developer</span> to get started.
          </div>
        </div>

        <!-- Add Developer Modal (removed initial WIP input) -->
        <Modal :open="showAddModal" title="Add Developer" @close="closeAddModal">
          <form @submit.prevent="submitAdd">
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-slate-600 mb-1">Name</label>
                <input v-model.trim="addName" required placeholder="e.g. Lauw" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <p v-if="addError" class="text-xs text-red-600">{{ addError }}</p>
            </div>
            <div class="mt-6 flex items-center justify-end gap-2">
              <button type="button" class="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50" @click="closeAddModal">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Add</button>
            </div>
          </form>
        </Modal>

        <!-- Reassign Modal -->
        <Teleport to="body">
          <div v-if="showReassign" class="fixed inset-0 z-[9999] flex items-center justify-center">
            <div class="absolute inset-0 bg-black/40" @click="closeReassign"></div>
            <div class="relative bg-white rounded-2xl border border-slate-200 shadow-lg w-full max-w-md p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium text-slate-800">Reassign Active Work</h3>
                <button @click="closeReassign" class="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div class="text-sm space-y-3">
                <p>
                  {{ targetToRemove }} has {{ activeCountFor(targetToRemove) }} active item(s). Pick a developer to reassign them before removal.
                </p>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium">Reassign to</label>
                  <select v-model="reassignTo" class="border rounded px-2 py-1">
                    <option disabled value="">Select developer</option>
                    <option v-for="d in developers.filter(x => x !== targetToRemove)" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <p v-if="modalError" class="text-xs text-red-600 mt-1">{{ modalError }}</p>
                </div>
                <div class="pt-2 flex gap-2 justify-end">
                  <button type="button" @click="closeReassign" class="bg-gray-200 hover:bg-gray-300 text-sm px-4 py-2 rounded-md">Cancel</button>
                  <button @click="confirmReassignAndRemove" class="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-md shadow">Reassign & Remove</button>
                </div>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';
import Modal from '../components/Modal.vue';
import DevProfile from '../components/DevProfile.vue';
import Sparkline from '../components/Sparkline.vue';
import { PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon, UserPlusIcon } from '@heroicons/vue/24/outline';
import { RouterLink } from 'vue-router';

const store = useProjectsStore();
const auth = useAuthStore();
const { developers, wipLimits, projects } = storeToRefs(store);
const workloadByDev = computed(() => store.workloadByDev);

// Add Developer (modal)
const showAddModal = ref(false);
const addName = ref('');
const addError = ref('');
function openAddModal(){ addName.value=''; addError.value=''; showAddModal.value = true; }
function closeAddModal(){ showAddModal.value = false; }
function submitAdd(){
  addError.value='';
  const name = (addName.value||'').trim();
  if(!name){ addError.value='Please enter a name.'; return; }
  const ok = store.addDeveloper(name);
  if(!ok){ addError.value='Name already exists or is invalid.'; return; }
  closeAddModal();
}

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

// Rename
const renameTarget = ref(null);
const renameValue = ref('');
const renameInputRef = ref(null);
function beginRename(name){ renameTarget.value = name; renameValue.value = name; nextTick(() => { renameInputRef.value && renameInputRef.value.focus(); }); }
function cancelRename(){ renameTarget.value = null; renameValue.value = ''; }
function saveRename(oldName){
  const to = (renameValue.value || '').trim();
  if (!to) return;
  const ok = store.renameDeveloper(oldName, to);
  if (ok) cancelRename();
}

// Remove
const showReassign = ref(false);
const targetToRemove = ref('');
const reassignTo = ref('');
const modalError = ref('');
function activeCountFor(name){
  return projects.value.filter(p => p.assignedDev === name && p.stage !== 'production' && p.stage !== 'canceled').length;
}
function remove(name){
  modalError.value = '';
  const active = activeCountFor(name);
  if (!active) {
    // confirm simple removal
    if (confirm(`Remove ${name}?`)) store.removeDeveloper(name);
    return;
  }
  targetToRemove.value = name;
  reassignTo.value = developers.value.find(d => d !== name) || '';
  showReassign.value = true;
}
function closeReassign(){ showReassign.value = false; targetToRemove.value = ''; reassignTo.value=''; }
function confirmReassignAndRemove(){
  modalError.value = '';
  const to = (reassignTo.value||'').trim();
  if (!to) { modalError.value = 'Please select a developer to reassign to.'; return; }
  const ok = store.removeDeveloper(targetToRemove.value, to);
  if (!ok) { modalError.value = 'Reassignment failed. Choose a valid developer.'; return; }
  closeReassign();
}

// Raw per-dev completions by day
const devSparkRawMap = computed(() => {
  const map = {};
  (projects.value || []).forEach(p => {
    if (p.stage === 'production') {
      const dev = p.assignedDev; if (!dev) return;
      const day = (p.completedAt || p.startedAt || p.createdAt || '').slice(0,10);
      if (!day) return;
      if (!map[dev]) map[dev] = {};
      map[dev][day] = (map[dev][day] || 0) + 1;
    }
  });
  return map;
});
const devSparkRawRecent = computed(() => {
  const out = {};
  (store.developers || []).forEach(dev => {
    const dayCounts = devSparkRawMap.value[dev] || {};
    const days = Object.keys(dayCounts).sort();
    const slice = days.slice(-12);
    out[dev] = slice.map(d => ({ date: d, count: dayCounts[d] }));
  });
  return out;
});
const devSparkMA7 = computed(() => {
  const out = {};
  (store.developers || []).forEach(dev => {
    const raw = devSparkRawRecent.value[dev] || [];
    const nums = raw.map(r => r.count);
    const ma = nums.map((_, i) => {
      const start = Math.max(0, i - 6);
      const window = nums.slice(start, i + 1);
      const avg = window.reduce((a,b)=>a+b,0) / window.length;
      return +avg.toFixed(2);
    });
    out[dev] = ma;
  });
  return out;
});
function devSparkAvg7d(dev){
  const arr = devSparkMA7.value[dev] || [];
  if (!arr.length) return '0';
  return arr[arr.length-1];
}
function devSparkColor(dev){
  const stats = store.devStats?.[dev];
  const needed = store.requiredVelocityToHitTarget;
  if (!stats || !stats.throughput){ return '#94A3B8'; }
  if (!needed || !isFinite(needed) || needed <= 0){ return '#10B981'; }
  if (stats.throughput >= needed) return '#10B981';
  if (stats.throughput >= needed * 0.6) return '#F59E0B';
  return '#EF4444';
}
function devSparkColorClass(dev){
  const c = devSparkColor(dev);
  if (c === '#10B981') return 'bg-emerald-500';
  if (c === '#F59E0B') return 'bg-amber-500';
  if (c === '#EF4444') return 'bg-rose-500';
  return 'bg-slate-400';
}
</script>

<style scoped>
.icon-btn { @apply inline-flex items-center justify-center w-8 h-8 rounded-md transition text-sm font-medium; }
</style>
