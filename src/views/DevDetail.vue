<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8" v-if="validDev">
    <Teleport to="#header-actions">
      <div class="flex items-center gap-2 min-w-0">
        <div class="hidden sm:flex items-center gap-2">
          <label class="text-[11px] text-slate-600">Type</label>
          <select v-model="typeFilter" class="border rounded px-2 py-1 text-xs">
            <option value="all">All</option>
            <option value="migration">Migration</option>
            <option value="newbuild">New Build</option>
          </select>
        </div>
        <div class="hidden sm:flex items-center gap-2">
          <label class="text-[11px] text-slate-600">Active</label>
          <select v-model="activeSortKey" class="border rounded px-2 py-1 text-xs">
            <option value="age">Age</option>
            <option value="name">Name</option>
            <option value="stage">Stage</option>
            <option value="targetDays">Target Days</option>
            <option value="startedAt">Started</option>
            <option value="createdAt">Created</option>
          </select>
          <select v-model="activeSortDir" class="border rounded px-2 py-1 text-xs w-20">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div class="hidden sm:flex items-center gap-2">
          <label class="text-[11px] text-slate-600">Completed</label>
          <select v-model="completedSortKey" class="border rounded px-2 py-1 text-xs">
            <option value="completedAt">Completed</option>
            <option value="cycle">Cycle</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
          <select v-model="completedSortDir" class="border rounded px-2 py-1 text-xs w-20">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <!-- Mobile compact controls -->
        <details class="sm:hidden ml-1">
          <summary class="text-xs px-2 py-1 border rounded bg-white">Filters</summary>
          <div class="mt-2 p-2 border rounded bg-white shadow space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <label class="w-20 text-right">Type</label>
              <select v-model="typeFilter" class="border rounded px-2 py-1 text-xs w-full">
                <option value="all">All</option>
                <option value="migration">Migration</option>
                <option value="newbuild">New Build</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="w-20 text-right">Active</label>
              <select v-model="activeSortKey" class="border rounded px-2 py-1 text-xs w-full">
                <option value="age">Age</option>
                <option value="name">Name</option>
                <option value="stage">Stage</option>
                <option value="targetDays">Target Days</option>
                <option value="startedAt">Started</option>
                <option value="createdAt">Created</option>
              </select>
              <select v-model="activeSortDir" class="border rounded px-2 py-1 text-xs w-24">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="w-20 text-right">Completed</label>
              <select v-model="completedSortKey" class="border rounded px-2 py-1 text-xs w-full">
                <option value="completedAt">Completed</option>
                <option value="cycle">Cycle</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
              </select>
              <select v-model="completedSortDir" class="border rounded px-2 py-1 text-xs w-24">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </details>
      </div>
    </Teleport>

    <!-- Metrics -->
    <div class="grid md:grid-cols-6 gap-4">
      <MetricCard label="Active" :value="activeCount">
        <template #icon>
          <Sparkline v-if="showSparklines" :data="[activeCount-2, activeCount-1, activeCount]" color="#64748B" />
        </template>
      </MetricCard>
      <MetricCard label="Completed" :value="completedCount">
        <template #icon>
          <Sparkline v-if="showSparklines" :data="devSparkCompleted" color="#10B981" />
        </template>
      </MetricCard>
      <MetricCard label="Avg Cycle (bdays)" :value="avgCycle || 0">
        <template #icon>
          <Sparkline v-if="showSparklines" :data="devSparkAvgCycleReal" color="#94A3B8" />
        </template>
      </MetricCard>
      <MetricCard label="Throughput / day" :value="throughput || 0">
        <template #icon>
          <Sparkline v-if="showSparklines" :data="devSparkThroughput" color="#3B82F6" />
        </template>
      </MetricCard>
      <MetricCard label="Oldest Active Age" :value="oldestActiveAge">
        <template #icon>
          <Sparkline v-if="showSparklines" :data="devSparkOldestAgeReal" color="#F59E0B" />
        </template>
      </MetricCard>
      <MetricCard label="WIP" :value="`${activeCount}/${wipLimit}`">
        <template #icon>
          <Sparkline v-if="showSparklines" :data="[Math.max((activeCount||0)-1,0), (activeCount||0), Math.max((wipLimit||0),0)]" color="#EF4444" />
        </template>
      </MetricCard>
    </div>

    <!-- On-time metric (overall) -->
    <div v-if="filteredOnTimeRate !== null && filteredOnTimeRate !== undefined" class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
      <h3 class="font-medium mb-2 text-slate-800">On-time ({{ typeFilterLabel }})</h3>
      <div class="flex items-center justify-between text-[10px] mb-1">
        <div class="flex items-center gap-1.5 text-gray-500">
          <Fa icon="gauge" class="w-3.5 h-3.5" />
          <div>On-time</div>
        </div>
        <div class="font-medium text-gray-900">{{ filteredOnTimeRate }}%</div>
      </div>
      <div class="h-2 bg-gray-100 rounded overflow-hidden">
        <div class="h-2 rounded" :class="onTimeBarClass" :style="{ width: (filteredOnTimeRate || 0) + '%' }"></div>
      </div>
    </div>

    <!-- Charts -->
    <section aria-labelledby="graphs-heading" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 id="graphs-heading" class="font-medium text-slate-800">Graphs ({{ typeFilterLabel }})</h3>
        <div
          role="tablist"
          aria-label="Graphs"
          class="inline-flex items-center gap-1 rounded-full bg-slate-100/90 backdrop-blur px-1 py-1 border border-slate-200 shadow-sm"
          @keydown.left.prevent="focusPrevTab"
          @keydown.right.prevent="focusNextTab"
        >
          <button
            v-for="t in graphTabs"
            :key="t.key"
            role="tab"
            :id="`tab-${t.key}`"
            :aria-controls="`panel-${t.key}`"
            :aria-selected="activeGraphTab === t.key"
            @click="activeGraphTab = t.key"
            class="px-3.5 py-1.5 rounded-full text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 transition-colors"
            :class="activeGraphTab === t.key
              ? 'bg-white text-slate-900 shadow border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 active:bg-white/70'
            "
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- Panels -->
      <div
        v-show="activeGraphTab === 'burndown'"
        role="tabpanel"
        :id="'panel-burndown'"
        :aria-labelledby="'tab-burndown'"
        class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm"
      >
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium text-slate-800">Burn Down (Remaining Work)</h4>
          <div class="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
            Today: {{ new Date().toISOString().slice(0,10) }}
          </div>
        </div>
        <BurnDownChart :data="devBurnDownData" />
      </div>

      <div
        v-show="activeGraphTab === 'throughput'"
        role="tabpanel"
        :id="'panel-throughput'"
        :aria-labelledby="'tab-throughput'"
        class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm"
      >
        <h4 class="font-medium mb-2 text-slate-800">Daily Completions & Throughput</h4>
        <DailyThroughputChart :data="devVelocityChartData" />
      </div>

      <div
        v-show="activeGraphTab === 'velocity'"
        role="tabpanel"
        :id="'panel-velocity'"
        :aria-labelledby="'tab-velocity'"
        class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm"
      >
        <h4 class="font-medium mb-2 text-slate-800">Completion Velocity</h4>
        <VelocityChart :data="devVelocityChartData" />
      </div>
    </section>

    <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
      <h3 class="font-medium mb-3 text-slate-800">Active Projects</h3>
      <table class="w-full text-sm">
        <thead class="text-xs text-gray-500 text-left">
          <tr>
            <th class="py-1">Name</th>
            <th class="py-1">Type</th>
            <th class="py-1">Stage</th>
            <th class="py-1">Age (bdays)</th>
            <th class="py-1 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in activeSorted" :key="p.id" class="border-t">
            <td class="py-1 pr-2">{{ p.name }}</td>
            <td class="py-1 pr-2"><TypeBadge :type="p.type" /></td>
            <td class="py-1 pr-2">{{ p.stage }}</td>
            <td class="py-1 pr-2">{{ projectAge(p) }}</td>
            <td class="py-1 pr-2 text-right space-x-1">
              <button v-if="p.stage !== 'production' && p.stage !== 'canceled'" @click="advance(p.id)" class="text-xs px-2 py-1 bg-blue-600 text-white rounded">Advance</button>
            </td>
          </tr>
          <tr v-if="!activeSorted.length">
            <td colspan="5" class="py-4 text-center text-xs text-gray-400">No active projects</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
      <h3 class="font-medium mb-3 text-slate-800">Recently Completed</h3>
      <table class="w-full text-sm">
        <thead class="text-xs text-gray-500 text-left">
          <tr>
            <th class="py-1">Name</th>
            <th class="py-1">Type</th>
            <th class="py-1">Cycle (bdays)</th>
            <th class="py-1">Completed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in completedSorted" :key="p.id" class="border-t">
            <td class="py-1 pr-2">{{ p.name }}</td>
            <td class="py-1 pr-2"><TypeBadge :type="p.type" /></td>
            <td class="py-1 pr-2">{{ cycleTime(p) }}</td>
            <td class="py-1 pr-2">{{ p.completedAt?.slice(0,10) }}</td>
          </tr>
          <tr v-if="!completedSorted.length">
            <td colspan="4" class="py-4 text-center text-xs text-gray-400">No completed projects</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="max-w-3xl mx-auto p-6">
    <RouterLink to="/" class="text-xs text-blue-600 hover:underline">← Back to Dashboard</RouterLink>
    <p class="mt-4 text-sm text-red-600">Developer '{{ dev }}' not found.</p>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '../stores/projects';
import MetricCard from '../components/MetricCard.vue';
import VelocityChart from '../components/VelocityChart.vue';
import DailyThroughputChart from '../components/DailyThroughputChart.vue';
import BurnDownChart from '../components/BurnDownChart.vue';
import TypeBadge from '../components/partials/TypeBadge.vue';
import DevProfile from '../components/DevProfile.vue';
import MVPTooltip from '../components/MVPTooltip.vue';
import Sparkline from '../components/Sparkline.vue';
import { parseISO, differenceInBusinessDays, addDays, formatISO, isBefore, isWeekend, addBusinessDays } from 'date-fns';
import { useStorage } from '@vueuse/core';

const route = useRoute();
const dev = route.params.dev;
const store = useProjectsStore();

const validDev = computed(()=> store.developers.includes(dev));

// Type filter (reactive)
const typeFilter = ref('all');

// sorting state
const activeSortKey = ref('age');
const activeSortDir = ref('desc');
const completedSortKey = ref('completedAt');
const completedSortDir = ref('desc');

// WIP limit
const wipLimit = computed(()=> (store.wipLimits?.[dev] ?? 3));
function onWipChange(val){ store.setWipLimit(dev, Number(val)); }

// filter helpers
function typeMatch(p){ return typeFilter.value === 'all' || p.type === typeFilter.value; }

const allForDev = computed(()=> store.projects.filter(p => p.assignedDev === dev && typeMatch(p)));
const active = computed(()=> allForDev.value.filter(p => p.stage !== 'production' && p.stage !== 'canceled'));
const completed = computed(()=> allForDev.value.filter(p => p.stage === 'production'));

const activeCount = computed(()=> active.value.length);
const completedCount = computed(()=> completed.value.length);

const avgCycle = computed(()=> {
  const arr = completed.value.filter(p => p.startedAt && p.completedAt).map(p => differenceInBusinessDays(parseISO(p.completedAt), parseISO(p.startedAt)));
  if (!arr.length) return 0;
  return +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2);
});

const throughput = computed(()=> {
  if (!completed.value.length) return 0;
  const first = completed.value.reduce((earliest, p) => !earliest || (p.startedAt && p.startedAt < earliest) ? p.startedAt : earliest, null);
  if (!first) return 0;
  const days = Math.max(differenceInBusinessDays(new Date(), parseISO(first)),1);
  return +(completed.value.length / days).toFixed(3);
});

const oldestActiveAge = computed(()=> {
  if (!active.value.length) return 0;
  const oldest = active.value.reduce((o,p)=> (!o || (p.startedAt||p.createdAt) < (o.startedAt||o.createdAt)) ? p : o, null);
  if (!oldest) return 0;
  return differenceInBusinessDays(new Date(), parseISO(oldest.startedAt || oldest.createdAt));
});

const stageCounts = computed(()=> {
  const map = {};
  active.value.forEach(p => { map[p.stage] = (map[p.stage]||0)+1; });
  return map;
});

function stageColor(stage){
  switch(stage){
    case 'planning': return 'bg-gray-300';
    case 'template_build': return 'bg-migration';
    case 'review': return 'bg-review';
    case 'final_updates': return 'bg-newbuild';
    case 'production': return 'bg-emerald-600';
    default: return 'bg-gray-200';
  }
}

function cycleTime(p){
  if (!(p.startedAt && p.completedAt)) return '-';
  return differenceInBusinessDays(parseISO(p.completedAt), parseISO(p.startedAt));
}
function projectAge(p){
  return differenceInBusinessDays(new Date(), parseISO(p.startedAt || p.createdAt));
}
function advance(id){ store.advanceStage(id); }

// sorting functions
function sortActive(list, key, dirStr){
  const arr = [...list];
  const dir = dirStr === 'asc' ? 1 : -1;
  arr.sort((a,b) => {
    switch(key){
      case 'name': return dir * a.name.localeCompare(b.name);
      case 'stage': return dir * a.stage.localeCompare(b.stage);
      case 'targetDays': return dir * ((a.targetDays||0) - (b.targetDays||0));
      case 'startedAt': return dir * (new Date(a.startedAt||0) - new Date(b.startedAt||0));
      case 'createdAt': return dir * (new Date(a.createdAt||0) - new Date(b.createdAt||0));
      case 'age': default: return dir * (projectAge(a) - projectAge(b));
    }
  });
  return arr;
}
function sortCompleted(list, key, dirStr){
  const arr = [...list];
  const dir = dirStr === 'asc' ? 1 : -1;
  arr.sort((a,b) => {
    switch(key){
      case 'name': return dir * a.name.localeCompare(b.name);
      case 'type': return dir * a.type.localeCompare(b.type);
      case 'cycle': {
        const ca = cycleTime(a) || 0, cb = cycleTime(b) || 0; return dir * (ca - cb);
      }
      case 'completedAt': default: return dir * (new Date(a.completedAt||0) - new Date(b.completedAt||0));
    }
  });
  return arr;
}

const activeSorted = computed(()=> sortActive(active.value, activeSortKey.value, activeSortDir.value));
const completedSorted = computed(()=> sortCompleted(completed.value, completedSortKey.value, completedSortDir.value));

// Charts data
const typeFilterLabel = computed(()=> typeFilter.value === 'all' ? 'All' : (typeFilter.value === 'migration' ? 'Migration' : 'New Build'));

// Legacy per-dev velocity arrays (kept for reference) -- not used by the new chart
const devVelocityData = computed(()=> {
  const done = completed.value;
  const pointsMap = {};
  done.forEach(p => { if (p.completedAt){ const d = p.completedAt.slice(0,10); pointsMap[d] = (pointsMap[d]||0)+1; }});
  const days = Object.keys(pointsMap).sort();
  let cumulative = 0; return days.map(d => { cumulative += pointsMap[d]; return { date: d, value: cumulative }; });
});

const devBurnDownData = computed(()=> {
  // mirror dashboard logic but scoped to this dev and filtered by type
  const projects = allForDev.value; // already type-filtered
  if (!projects.length) return { labels: [], actual: [], ideal: [], idealAbsolute: [], forecast: [], today: new Date().toISOString().slice(0,10), targetDate: store.targetAllCompletionDate, forecastDate: null };
  const nonCanceled = projects.filter(p => p.stage !== 'canceled');
  const total = nonCanceled.length;
  const today = new Date();
  const todayStr = formatISO(today).slice(0,10);
  const completionsByDay = {};
  projects.forEach(p => {
    if (p.stage === 'production') {
      if (p.completedAt) {
        const d = p.completedAt.slice(0,10);
        completionsByDay[d] = (completionsByDay[d]||0) + 1;
      } else {
        completionsByDay[todayStr] = (completionsByDay[todayStr]||0) + 1;
      }
    } else if (p.stage === 'canceled') {
      const d = p.completedAt ? p.completedAt.slice(0,10) : todayStr;
      completionsByDay[d] = (completionsByDay[d]||0) + 1;
    }
  });
  const firstDateISO = (nonCanceled.length ? nonCanceled : projects).reduce((earliest, p) => !earliest || p.createdAt < earliest ? p.createdAt : earliest, projects[0].createdAt);
  const completionDays = Object.keys(completionsByDay).sort();
  const startDate = completionDays.length ? parseISO(completionDays[0]) : parseISO(firstDateISO);
  const lastRelevant = parseISO(store.targetAllCompletionDate);
  const labels = []; let cursor = new Date(startDate);
  while (!isBefore(lastRelevant, cursor)) { labels.push(formatISO(cursor).slice(0,10)); cursor = addDays(cursor,1); }
  let cumulative = 0; const actual = labels.map(d => { cumulative += (completionsByDay[d]||0); return total - cumulative; });
  // Remaining as of today for anchored & forecast
  const produced = projects.filter(p => p.stage === 'production').length;
  let remaining = total - produced;
  // Ideal anchored (null for past days)
  const totalBizDaysForward = Math.max(differenceInBusinessDays(lastRelevant, today), 1);
  const ideal = labels.map(d => {
    const dateObj = parseISO(d + 'T00:00:00');
    if (isBefore(dateObj, today)) return null;
    const idx = Math.min(Math.max(differenceInBusinessDays(dateObj, today), 0), totalBizDaysForward);
    return +(remaining * (1 - idx/totalBizDaysForward)).toFixed(2);
  });
  // Ideal absolute across entire range (business days between start and target)
  const totalBizDaysAbs = Math.max(differenceInBusinessDays(lastRelevant, startDate), 1);
  const idealAbsolute = labels.map(d => {
    const idx = Math.min(Math.max(differenceInBusinessDays(parseISO(d), startDate), 0), totalBizDaysAbs);
    return +(total * (1 - idx/totalBizDaysAbs)).toFixed(2);
  });
  // Per-dev throughput (production only)
  let throughput = 0; const done = projects.filter(p => p.stage === 'production');
  if (done.length){
    const firstStartISO = done.reduce((earliest, p) => !earliest || (p.startedAt||p.createdAt) < earliest ? (p.startedAt||p.createdAt) : earliest, done[0].startedAt||done[0].createdAt);
    const days = Math.max(differenceInBusinessDays(today, parseISO(firstStartISO)),1);
    throughput = done.length / days;
  }
  const forecast = labels.map(d => {
    const dateObj = parseISO(d + 'T00:00:00');
    if (isBefore(dateObj, today)) return null;
    if (d === todayStr) return +remaining.toFixed(2);
    if (!isWeekend(dateObj)) remaining = Math.max(0, remaining - throughput);
    return +remaining.toFixed(2);
  });
  // Compute per-dev forecast date (when remaining hits 0 in forecast)
  let forecastDate = null;
  for (let i=0;i<labels.length;i++){
    const y = forecast[i];
    if (typeof y === 'number' && y <= 0) { forecastDate = labels[i]; break; }
  }
  return { labels, actual, ideal, idealAbsolute, forecast, today: todayStr, targetDate: store.targetAllCompletionDate, forecastDate };
});

// New: data for the enhanced VelocityChart (per-dev)
const devVelocityChartData = computed(() => {
  const labels = devBurnDownData.value?.labels || [];
  const actualRemaining = devBurnDownData.value?.actual || [];
  const idealAbsolute = devBurnDownData.value?.idealAbsolute || [];

  if (!labels.length) return { labels: [], daily: [], ma7: [], cumActual: [], cumIdeal: [], requiredPerDay: 0, avgPerDay: 0, today: new Date().toISOString().slice(0,10), targetDate: store.targetAllCompletionDate, forecastDate: null };

  // total work from first idealAbsolute value (remaining at start)
  const total = typeof idealAbsolute[0] === 'number' ? idealAbsolute[0] : (Math.max(...idealAbsolute.filter(n => typeof n === 'number')) || 0);

  // cumulative actual completions = total - remaining
  const cumActual = actualRemaining.map(v => typeof v === 'number' ? Math.max(0, total - v) : null);
  const cumIdeal = idealAbsolute.map(v => typeof v === 'number' ? Math.max(0, total - v) : null);

  // daily completions = diff of cumActual (non-negative)
  const daily = cumActual.map((v, i) => {
    if (v == null) return 0;
    const prev = i > 0 && cumActual[i-1] != null ? cumActual[i-1] : 0;
    return Math.max(0, +(v - prev).toFixed(3));
  });

  // 7-day simple moving average
  const window = 7;
  const ma7 = daily.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = daily.slice(start, i + 1);
    const sum = slice.reduce((a,b)=>a+b,0);
    return +(sum / slice.length).toFixed(3);
  });

  const todayStr = new Date().toISOString().slice(0,10);
  const targetDate = store.targetAllCompletionDate;
  const remaining = activeCount.value; // active items for this dev under filter
  const daysLeft = differenceInBusinessDays(parseISO(targetDate), new Date());
  const requiredPerDay = daysLeft <= 0 ? Infinity : +(remaining / daysLeft).toFixed(3);
  const avgPerDay = +(throughput.value || 0).toFixed(3);

  // forecast date taken from burn down forecast annotations
  const forecastDate = devBurnDownData.value?.forecastDate || null;

  return {
    labels: labels.map(d => new Date(d).toISOString().split('T')[0]),
    daily,
    ma7,
    cumActual: cumActual.map(v => v ?? null),
    cumIdeal: cumIdeal.map(v => v ?? null),
    requiredPerDay: (requiredPerDay === Infinity) ? null : requiredPerDay,
    avgPerDay,
    today: todayStr,
    targetDate,
    forecastDate
  };
});

// export CSV
function exportCSV(){
  const rows = [['Name','Type','Stage','TargetDays','StartedAt','CompletedAt']];
  allForDev.value.forEach(p => rows.push([p.name, p.type, p.stage, String(p.targetDays||''), p.startedAt||'', p.completedAt||'']));
  const csv = rows.map(r=> r.map(v=> '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${dev}-projects.csv`; a.click();
  URL.revokeObjectURL(url);
}

// MVP flags and stats for this dev
const isMvpOverall = computed(() => store.mvpDev === dev);
const isMvpMonth = computed(() => store.mvpDevThisMonth === dev);
const isMvp7d = computed(() => store.mvpDevLast7Days === dev);

const fallbackStats = { completed: 0, throughput: 0, avgCycle: null, active: 0, onTimeRate: null };
const devStatsOverall = computed(() => (store.devStats?.[dev] ? store.devStats[dev] : fallbackStats));
const devStatsMonth = computed(() => (store.devStatsThisMonth?.[dev] ? store.devStatsThisMonth[dev] : fallbackStats));
const devStats7d = computed(() => (store.devStatsLast7Days?.[dev] ? store.devStatsLast7Days[dev] : fallbackStats));


// Compute filtered on-time rate for this dev under current type filter
const filteredOnTimeRate = computed(() => {
  const list = allForDev.value; // already filtered by type
  const completed = list.filter(p => p.stage === 'production');
  if (!completed.length) return null;
  const onTimeCompleted = completed.filter(p => {
    if (!p.completedAt) return false;
    const start = parseISO(p.startedAt || p.createdAt);
    const expected = addBusinessDays(start, p.targetDays || 4);
    return !isBefore(expected, parseISO(p.completedAt));
  }).length;
  return +((onTimeCompleted / completed.length) * 100).toFixed(0);
});

const onTimeBarClass = computed(() => {
  const r = Number(filteredOnTimeRate.value || 0);
  if (r >= 80) return 'bg-emerald-500';
  if (r >= 60) return 'bg-amber-500';
  return 'bg-red-500';
});

// Per-dev micro-series
const devSparkCompleted = computed(() => devVelocityData.value.map(p=>p.value).slice(-12));
const devSparkThroughput = computed(() => {
  const arr = devVelocityData.value;
  const vals = arr.map((p,i) => i>0 ? Math.max(0, arr[i].value - arr[i-1].value) : arr[0].value||0);
  return vals.slice(-12);
});

const showSparklines = useStorage('pref_show_sparklines', true);

// Build a recent date window (ISO yyyy-mm-dd) from earliest of 30 days ago or first dev velocity date to today
const recentDates = computed(() => {
  const today = new Date();
  const start = new Date(); start.setDate(today.getDate() - 30);
  const vel = devVelocityData.value || [];
  if (vel.length) {
    const first = parseISO(vel[0].date + 'T00:00:00');
    if (first < start) start.setTime(first.getTime());
  }
  const arr = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate()+1)) {
    arr.push(formatISO(d).slice(0,10));
  }
  return arr;
});

// Historical Avg Cycle per day: average business-day cycle of items completed on that day; then 7-day rolling average
const devSparkAvgCycleReal = computed(() => {
  const dates = recentDates.value;
  const byDay = new Map();
  completed.value.forEach(p => {
    if (p.startedAt && p.completedAt){
      const day = p.completedAt.slice(0,10);
      const val = differenceInBusinessDays(parseISO(p.completedAt), parseISO(p.startedAt));
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(val);
    }
  });
  const dailyAvg = dates.map(d => {
    const arr = byDay.get(d) || [];
    if (!arr.length) return null;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  });
  // compute 7-day rolling avg ignoring nulls
  const rolling = dailyAvg.map((_,i) => {
    const win = dailyAvg.slice(Math.max(0,i-6), i+1).filter(v=>v!==null);
    if (!win.length) return null;
    return +(win.reduce((a,b)=>a+b,0)/win.length).toFixed(2);
  }).filter(v=>v!==null);
  return rolling.slice(-12);
});

// Historical Oldest Active Age per day: for each day, max business-day age among projects active on that day
const devSparkOldestAgeReal = computed(() => {
  const dates = recentDates.value;
  const items = allForDev.value;
  const series = [];
  dates.forEach(d => {
    const dayEnd = parseISO(d + 'T23:59:59');
    // project is active on day d if created <= d and not in production/canceled by that day
    const activeOnDay = items.filter(p => {
      const created = parseISO((p.startedAt || p.createdAt));
      if (created > dayEnd) return false;
      if (p.stage === 'production' || p.stage === 'canceled') {
        const comp = p.completedAt ? parseISO(p.completedAt) : null;
        if (comp && comp <= dayEnd) return false;
      }
      return true;
    });
    if (!activeOnDay.length) { series.push(0); return; }
    const maxAge = Math.max(...activeOnDay.map(p => differenceInBusinessDays(dayEnd, parseISO(p.startedAt || p.createdAt))));
    series.push(maxAge);
  });
  return series.slice(-12);
});

// Graph tabs (mirror dashboard)
const graphTabs = [
  { key: 'burndown', label: 'Burn Down' },
  { key: 'throughput', label: 'Throughput' },
  { key: 'velocity', label: 'Velocity' }
];
const activeGraphTab = useStorage('dev_graph_tab', 'burndown');
function focusPrevTab(){
  const idx = graphTabs.findIndex(t => t.key === activeGraphTab.value);
  const next = (idx - 1 + graphTabs.length) % graphTabs.length;
  activeGraphTab.value = graphTabs[next].key;
}
function focusNextTab(){
  const idx = graphTabs.findIndex(t => t.key === activeGraphTab.value);
  const next = (idx + 1) % graphTabs.length;
  activeGraphTab.value = graphTabs[next].key;
}
</script>
