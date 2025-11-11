<template>
  <div class="max-w-7xl mx-auto p-8 space-y-8">
    <Teleport to="#header-actions">
      <div class="flex items-center gap-2 min-w-0">
        <!-- Header filters: show only on 2xl+ screens -->
        <div class="hidden 2xl:flex items-center gap-3">
          <input v-model="search" placeholder="Search Projects" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          <select v-model="typeFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="all">All Types</option>
            <option value="migration">Migration</option>
            <option value="newbuild">New Build</option>
          </select>
          <select v-model="devFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="all">All Devs</option>
            <option v-for="d in developers" :key="d" :value="d">{{ d }}</option>
          </select>
          <select v-model="stageFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="all">All Stages</option>
            <option v-for="s in stageOptions" :key="s" :value="s">{{ s }}</option>
          </select>
          <div class="flex items-center gap-2">
            <input type="date" v-model="startDate" aria-label="Start date" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            <span class="text-slate-400">→</span>
            <input type="date" v-model="endDate" aria-label="End date" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          </div>
          <button @click="clearFilters" class="text-sm px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-sm">Clear</button>
        </div>
        <!-- Chips always visible -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200">{{ activeCount }} Active</span>
          <span v-if="overdueCount > 0" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium border border-rose-200">{{ overdueCount }} Overdue</span>
        </div>
      </div>
    </Teleport>

    <!-- Responsive filters panel (visible below 2xl) -->
    <div class="2xl:hidden bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-center gap-2">
        <input v-model="search" placeholder="Search Projects" class="flex-1 min-w-[80px] border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
        <select v-model="typeFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="all">All Types</option>
          <option value="migration">Migration</option>
          <option value="newbuild">New Build</option>
        </select>
        <select v-model="devFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="all">All Devs</option>
          <option v-for="d in developers" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="stageFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
          <option value="all">All Stages</option>
          <option v-for="s in stageOptions" :key="s" :value="s">{{ s }}</option>
        </select>
        <div class="flex items-center gap-2 w-full">
          <input type="date" v-model="startDate" aria-label="Start date" class="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          <span class="text-slate-400">→</span>
          <input type="date" v-model="endDate" aria-label="End date" class="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          <button @click="clearFilters" class="text-sm px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-sm">Clear</button>
        </div>
      </div>
    </div>

    <section class="p-2 rounded-3xl bg-transparent">
      <WaterflowTimeline :projects="filteredProjects" />
    </section>
  </div>
</template>
<script setup>
import { storeToRefs } from 'pinia';
import { useProjectsStore, STAGES } from '../stores/projects';
import WaterflowTimeline from '../components/WaterflowTimeline.vue';
import { computed, ref } from 'vue';
import { parseISO, addBusinessDays, isAfter } from 'date-fns';

const store = useProjectsStore();
const { projects, developers } = storeToRefs(store);

// Filters
const search = ref('');
const typeFilter = ref('all');
const devFilter = ref('all');
const stageFilter = ref('all');
const startDate = ref('');
const endDate = ref('');
const stageOptions = STAGES.filter(s => s !== 'canceled');

function inDateRange(p){
  if (!(startDate.value || endDate.value)) return true;
  // Use startedAt if present else createdAt
  const baseISO = p.startedAt || p.createdAt;
  if (!baseISO) return false;
  let d; try { d = parseISO(baseISO); } catch { return false; }
  if (startDate.value){ try { if (d < parseISO(startDate.value)) return false; } catch {} }
  if (endDate.value){ try { if (d > parseISO(endDate.value)) return false; } catch {} }
  return true;
}

const filteredProjects = computed(() => {
  const q = (search.value || '').trim().toLowerCase();
  return (projects.value || []).filter(p => {
    if (typeFilter.value !== 'all' && p.type !== typeFilter.value) return false;
    if (devFilter.value !== 'all' && p.assignedDev !== devFilter.value) return false;
    if (stageFilter.value !== 'all' && p.stage !== stageFilter.value) return false;
    if (!inDateRange(p)) return false;
    if (q) {
      const name = (p.name || '').toLowerCase();
      const dev = (p.assignedDev || '').toLowerCase();
      const type = (p.type || '').toLowerCase();
      if (!(name.includes(q) || dev.includes(q) || type.includes(q))) return false;
    }
    return true;
  });
});

function clearFilters(){
  search.value=''; typeFilter.value='all'; devFilter.value='all'; stageFilter.value='all'; startDate.value=''; endDate.value='';
}

const today = new Date();
function startDateOf(p){
  try { return parseISO(p.startedAt || p.createdAt); } catch { return today; }
}
function expectedEnd(p){
  const s = startDateOf(p);
  return addBusinessDays(s, p.targetDays ?? 4);
}

// counts reflect filtered list
const activeCount = computed(() => {
  return filteredProjects.value.filter(p => {
    if (p.stage === 'canceled') return false;
    if (p.completedAt) return false;
    const exp = expectedEnd(p);
    return !isAfter(today, exp);
  }).length;
});
const overdueCount = computed(() => {
  return filteredProjects.value.filter(p => {
    if (p.stage === 'canceled') return false;
    if (p.completedAt) return false;
    const exp = expectedEnd(p);
    return isAfter(today, exp);
  }).length;
});
</script>
