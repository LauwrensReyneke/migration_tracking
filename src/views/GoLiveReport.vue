<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <Teleport to="#header-actions">
      <div class="flex items-center gap-2">
        <DBStatus />
      </div>
    </Teleport>
    <h2 class="text-xl font-semibold text-slate-900">Go-Live Report (Sites per Month)</h2>
    <p class="text-sm text-slate-600">Shows sites that went live (stage = Production) grouped by month of completion.</p>

    <div v-if="!months.length" class="rounded-xl border border-slate-200 bg-white/70 p-6 text-slate-600">No completed sites yet.</div>

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

const store = useProjectsStore();
const { projects } = storeToRefs(store);

function monthKeyFromISO(iso){
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return null;
    const m = startOfMonth(d);
    return m.toISOString().slice(0,7); // YYYY-MM
  } catch { return null; }
}

const months = computed(() => {
  const byMonth = {};
  // Seed current month key
  const now = new Date();
  const currentKey = now.toISOString().slice(0,7);
  byMonth[currentKey] = byMonth[currentKey] || [];
  (projects.value || []).forEach(p => {
    if (p.stage !== 'production') return;
    const iso = (p.completedAt || p.createdAt || '').slice(0,10);
    const key = monthKeyFromISO(iso);
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(p);
  });
  // Sort keys with current month first, then ascending others
  const keys = Object.keys(byMonth).sort((a,b) => {
    if (a === currentKey && b !== currentKey) return -1;
    if (b === currentKey && a !== currentKey) return 1;
    return a.localeCompare(b);
  });
  return keys.map(k => {
    const dt = parseISO(k + '-01');
    const start = formatISO(startOfMonth(dt)).slice(0,10);
    const end = formatISO(endOfMonth(dt)).slice(0,10);
    const label = new Date(k + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const items = (byMonth[k] || []).slice().sort((a,b) => String(a.completedAt||a.createdAt).localeCompare(String(b.completedAt||b.createdAt)));
    return { key: k, label, start, end, items };
  });
});
</script>
