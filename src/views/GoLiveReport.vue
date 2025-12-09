<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <Teleport to="#header-actions">
      <div class="flex items-center gap-2">
        <DBStatus />
        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span class="font-medium">Live Sites:</span>
          <span>{{ totalLive }}</span>
        </span>
        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-blue-200 bg-blue-50 text-blue-700 shadow-sm" :title="currentMonthLabel">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span class="font-medium">This Month:</span>
          <span>{{ currentMonthLive }}</span>
        </span>
      </div>
    </Teleport>
    <section class="grid md:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div class="text-xs text-slate-500">Total Live Sites</div>
        <div class="text-2xl font-semibold text-slate-900">{{ totalLive }}</div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div class="text-xs text-slate-500">This Month</div>
        <div class="text-2xl font-semibold text-slate-900">{{ currentMonthLive }}</div>
        <div class="text-[11px] text-slate-600">{{ currentMonthLabel }}</div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div class="text-xs text-slate-500">MoM Change</div>
        <div class="text-2xl font-semibold" :class="momDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ momDelta >= 0 ? '+'+momDelta : momDelta }}</div>
        <div class="text-[11px] text-slate-600">vs last month</div>
      </div>
    </section>
    <section class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <MonthlyGoLivesChart :data="barData" :height="260" />
    </section>
<!--    <h2 class="text-xl font-semibold text-slate-900">Live Sites</h2>-->
    <p class="text-sm text-slate-600">Shows sites that went live and grouped by month of completion.</p>

    <div v-if="!months.length" class="rounded-xl border border-slate-200 bg-white/70 p-6 text-slate-600">None completed sites yet.</div>

    <div v-else class="space-y-4">
      <div
        v-for="m in months"
        :key="m.key"
        class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-baseline gap-3">
            <h3 class="text-lg font-semibold text-slate-900">{{ m.label }}</h3>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">{{ m.items.length }} live</span>
          </div>
          <div class="text-[11px] text-slate-500">Completed between {{ m.start }} and {{ m.end }}</div>
        </div>
        <ul class="mt-3 grid md:grid-cols-2 gap-2">
          <li v-for="p in m.items" :key="p.id" class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
            <div class="flex items-center gap-2 min-w-0">
              <TypeBadge :type="p.type" />
              <span class="font-medium text-slate-900 truncate">{{ p.name }}</span>
            </div>
            <div class="text-xs text-slate-600">{{ (p.completedAt || p.createdAt).slice(0,10) }}</div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script setup>
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '../stores/projects';
import { computed } from 'vue';
import { parseISO, isValid, startOfMonth, endOfMonth, formatISO } from 'date-fns';
import DBStatus from '../components/DBStatus.vue';
import TypeBadge from '../components/partials/TypeBadge.vue';
import MonthlyGoLivesChart from '../components/MonthlyGoLives.vue';

function monthKeyFromISO(iso){
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  } catch { return null; }
}

const store = useProjectsStore();
const { projects } = storeToRefs(store);

const totalLive = computed(() => (projects.value || []).filter(p => p.stage === 'production').length);

const now = new Date();
const currentKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const currentMonthLabel = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
const currentMonthLive = computed(() => (projects.value || []).filter(p => {
  if (p.stage !== 'production') return false;
  const iso = (p.completedAt || p.createdAt || '').slice(0,10);
  return monthKeyFromISO(iso) === currentKey;
}).length);

const previousMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
const lastMonthLive = computed(() => (projects.value || []).filter(p => {
  if (p.stage !== 'production') return false;
  const iso = (p.completedAt || p.createdAt || '').slice(0,10);
  return monthKeyFromISO(iso) === previousMonthKey;
}).length);
const momDelta = computed(() => currentMonthLive.value - lastMonthLive.value);

const months = computed(() => {
  const byMonth = {};
  // Seed current month key using local
  byMonth[currentKey] = byMonth[currentKey] || [];
  (projects.value || []).forEach(p => {
    if (p.stage !== 'production') return;
    const iso = (p.completedAt || p.createdAt || '').slice(0,10);
    const key = monthKeyFromISO(iso);
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(p);
  });
  // Sort keys with current month first, then descending (newest to oldest) for others
  const keys = Object.keys(byMonth).sort((a,b) => {
    if (a === currentKey && b !== currentKey) return -1;
    if (b === currentKey && a !== currentKey) return 1;
    return b.localeCompare(a);
  });
  return keys.map(k => {
    const dt = parseISO(k + '-01');
    const start = formatISO(startOfMonth(dt)).slice(0,10);
    const end = formatISO(endOfMonth(dt)).slice(0,10);
    const label = new Date(dt).toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const items = (byMonth[k] || []).slice().sort((a,b) => String(a.completedAt||a.createdAt).localeCompare(String(b.completedAt||b.createdAt)));
    return { key: k, label, start, end, items };
  });
});

// const monthCounts = computed(() => months.value.map(m => ({ key: m.key, label: m.label, count: m.items.length })));

const monthTypeCounts = computed(() => months.value.map(m => ({
  key: m.key,
  label: m.label.split(' ')[0],
  migrationCount: m.items.filter(p => p.type === 'migration').length,
  newbuildCount: m.items.filter(p => p.type === 'newbuild').length,
  isCurrent: m.key === currentKey
})));

const barData = computed(() => {
  // Oldest → Newest order
  const arr = monthTypeCounts.value.slice();
  // Our months are current first then desc; reverse to get oldest→newest
  return arr.reverse();
});
</script>
