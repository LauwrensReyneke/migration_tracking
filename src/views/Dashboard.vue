<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8">
    <Teleport to="#header-actions">
      <div class="flex items-center gap-2">
        <DBStatus />
        <LocalPasteImport />
        <ExportMenu/>
      </div>
    </Teleport>

    <!-- MVP Pills back in content -->
    <div class="flex flex-wrap items-center gap-2 -mt-2 mb-2">
      <RouterLink v-if="mvpDev" :to="{ name: 'devDetail', params: { dev: mvpDev } }" class="group relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 shadow-sm overflow-visible">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
        <span class="font-medium">MVP:</span>
        <span>{{ mvpDev }}</span>
        <MVPTooltip :dev="mvpDev" periodLabel="Overall" :stats="mvpStatsOverall" placement="auto" />
      </RouterLink>
      <RouterLink v-if="mvpNameMonth" :to="{ name: 'devDetail', params: { dev: mvpNameMonth } }" class="group relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm overflow-visible">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span class="font-medium">MVP (Month):</span>
        <span>{{ mvpNameMonth }}</span>
        <MVPTooltip :dev="mvpNameMonth" periodLabel="This Month" :stats="mvpStatsMonth" placement="auto" />
      </RouterLink>
      <div v-else class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-gray-200 bg-gray-50 text-gray-600 shadow-sm" title="No month MVP — no completions in this window">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        <span class="font-medium">MVP (Month):</span>
        <span>—</span>
      </div>
      <RouterLink v-if="mvpName7d" :to="{ name: 'devDetail', params: { dev: mvpName7d } }" class="group relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm overflow-visible">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        <span class="font-medium">MVP (7d):</span>
        <span>{{ mvpName7d }}</span>
        <MVPTooltip :dev="mvpName7d" periodLabel="Last 7 days" :stats="mvpStats7d" placement="auto" />
      </RouterLink>
      <div v-else class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border border-gray-200 bg-gray-50 text-gray-600 shadow-sm" title="No 7d MVP — no completions in this window">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        <span class="font-medium">MVP (7d):</span>
        <span>—</span>
      </div>
    </div>

    <!-- High level metrics with icons -->
    <div class="grid md:grid-cols-4 gap-4">
      <MetricCard label="Total Projects" :value="totalCount">
        <template #bg>
          <Sparkline v-if="showSparklines" :data="sparkStarted" :color="totalProjectsColorClass" />
        </template>
        <template #icon>
          <div class="flex items-center gap-2">
            <Fa icon="list-ul" class="w-4 h-4 text-slate-500" />
          </div>
        </template>
      </MetricCard>
      <MetricCard label="Completed" :value="completedCount">
        <template #bg>
          <Sparkline v-if="showSparklines" :data="sparkCompleted" :color="completedColorClass" />
        </template>
        <template #icon>
          <Fa icon="circle-check" class="w-4 h-4 text-emerald-500" />
        </template>
      </MetricCard>
      <MetricCard label="Completion %" :value="(completionRatio*100).toFixed(0)+'%'"><template #bg>
        <Sparkline v-if="showSparklines" :data="sparkCompletionPct" :color="completionPctColorClass" />
      </template>
      <template #icon>
        <Fa icon="percent" class="w-4 h-4 text-blue-500" />
      </template></MetricCard>
      <MetricCard label="Target Date" :value="targetAllCompletionDate">
        <template #icon>
          <Fa icon="calendar-days" class="w-4 h-4 text-slate-500" />
        </template>
        <!-- Inline target date selector -->
        <div class="mt-2 flex items-end gap-2">
          <input type="date" v-model="targetDateLocal" class="border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
          <button @click="saveTarget" class="px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs shadow hover:bg-blue-700">Save</button>
        </div>
      </MetricCard>
    </div>

    <!-- Forecast & performance metrics -->
    <div class="grid md:grid-cols-6 gap-4">
      <MetricCard label="Remaining" :value="remainingCount">
        <template #bg>
          <Sparkline v-if="showSparklines" :data="sparkRemaining" :color="remainingColorClass" />
        </template>
        <template #icon>
          <Fa icon="list-ul" class="w-4 h-4 text-slate-500" />
        </template>
      </MetricCard>
      <MetricCard label="Avg Cycle (bdays)" :value="averageCycleDays">
        <template #bg>
          <Sparkline v-if="showSparklines" :data="sparkAvgCycle" :color="avgCycleColorClass" />
        </template>
        <template #icon>
          <Fa icon="clock" class="w-4 h-4 text-slate-500" />
        </template>
      </MetricCard>
      <MetricCard label="Throughput / day" :value="throughputPerBusinessDay">
        <template #bg>
          <Sparkline v-if="showSparklines" :data="sparkThroughput" :color="throughputColorClass" />
        </template>
        <template #icon>
          <Fa icon="bolt" class="w-4 h-4" :style="{ color: throughputColorClass }" />
        </template>
      </MetricCard>
      <MetricCard label="Needed / day" :value="requiredVelocityToHitTarget===Infinity?'∞':requiredVelocityToHitTarget">
        <template #bg>
          <Sparkline v-if="showSparklines" :data="sparkNeeded" :color="neededColorClass" />
        </template>
        <template #icon>
          <Fa icon="gauge" class="w-4 h-4" :style="{ color: neededColorClass }" />
        </template>
      </MetricCard>
      <MetricCard label="Forecast Date" :value="forecastCompletionDate || '—'">
        <template #icon>
          <Fa icon="calendar-days" class="w-4 h-4 text-slate-500" />
        </template>
      </MetricCard>
      <MetricCard label="Risk" :value="isTargetRisk ? 'AT RISK' : 'On Track'">
        <template #icon>
          <span v-if="isTargetRisk" class="relative inline-flex items-center gap-1">
            <Fa icon="triangle-exclamation" class="w-4 h-4 text-red-500 animate-pulse [animation-duration:2s] transition-transform duration-150 ease-out hover:scale-110 cursor-help" />
            <Tooltip :text="riskTooltipText" placement="auto" variant="danger" class="bg-red-500/50 text-white text-sm p-5 rounded-lg shadow-lg" />
          </span>
        </template>
      </MetricCard>
    </div>

    <!-- Graphs Tabs -->
    <section aria-labelledby="graphs-heading" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 id="graphs-heading" class="font-medium text-slate-800">Graphs</h3>
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
        <BurnDownChart :data="burnDownData" />
      </div>

      <div
        v-show="activeGraphTab === 'throughput'"
        role="tabpanel"
        :id="'panel-throughput'"
        :aria-labelledby="'tab-throughput'"
        class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm"
      >
        <h4 class="font-medium mb-2 text-slate-800">Daily Completions & Throughput</h4>
        <DailyThroughputChart :data="velocityChartData" />
      </div>

      <div
        v-show="activeGraphTab === 'velocity'"
        role="tabpanel"
        :id="'panel-velocity'"
        :aria-labelledby="'tab-velocity'"
        class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm"
      >
        <h4 class="font-medium mb-2 text-slate-800">Completion Velocity</h4>
        <VelocityChart :data="velocityChartData" />
      </div>
    </section>

    <!-- Developer workload -->
    <section class="">
      <h3 class="font-medium mb-4 text-slate-800">Developer Workload</h3>
      <div class="grid md:grid-cols-4 gap-4">
        <div
          v-for="(count, dev) in workloadByDev"
          :key="dev"
          class="group relative rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition ring-1 ring-transparent hover:ring-slate-200 hover:z-50"
        >
          <!-- MVP badge -->
          <span v-if="dev === mvpDev" class="absolute top-2 right-2 text-[10px] text-purple-700 bg-purple-100 border border-purple-200 rounded px-1.5 py-0.5">MVP</span>
          <!-- Name row clickable -->
          <RouterLink
            :to="{ name: 'devDetail', params: { dev } }"
            class="flex items-center gap-2 min-w-0 rounded-lg -mx-1 px-1 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-2"
            :aria-label="`View ${dev}`"
            :title="`View ${dev}`"
          >
            <DevProfile :name="dev" :size="30" :showText="true" :nameClass="'text-sm font-semibold tracking-tight text-slate-900 group-hover:text-blue-700'" :wrapperClass="'flex items-center gap-2 min-w-0'" />
          </RouterLink>
          <!-- Chips -->
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              <span class="w-2 h-2 rounded-full" :class="(count||0) > (wipLimits[dev]||Infinity) ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'"></span>
              Active: {{ count || 0 }}
            </span>
            <span v-if="wipLimits[dev]" class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">WIP {{ wipLimits[dev] }}</span>
          </div>
          <!-- Sparkline + label only, no tooltip panel -->
          <div class="mt-1 relative">
            <Sparkline :data="devSparkMA7[dev]" :color="devSparkColor(dev)" :w="100" :h="24" :stroke-width="2" />
            <div v-if="devSparkRawRecent[dev] && devSparkRawRecent[dev].length" class="mt-1 text-[10px] text-slate-500 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full" :class="devSparkColorClass(dev)"></span>
              <span>7d MA · Completions</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pipeline -->
    <section class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto pipeline-scroll">
      <h3 class="font-medium mb-4 text-slate-800">Pipeline</h3>
      <Waterflow :projects="projects" />
    </section>
  </div>
</template>
<script setup>
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '../stores/projects';
import MetricCard from '../components/MetricCard.vue';
import VelocityChart from '../components/VelocityChart.vue';
import BurnDownChart from '../components/BurnDownChart.vue';
import Waterflow from '../components/Waterflow.vue';
import MVPTooltip from '../components/MVPTooltip.vue';
import DevProfile from '../components/DevProfile.vue';
import Sparkline from '../components/Sparkline.vue';
import Tooltip from '../components/Tooltip.vue';
import DailyThroughputChart from '../components/DailyThroughputChart.vue';
import DBStatus from '../components/DBStatus.vue';
import LocalPasteImport from '../components/LocalPasteImport.vue';
import { ref, computed } from 'vue';
import { useStorage } from '@vueuse/core'
import ExportMenu from "../components/ExportMenu.vue";

const store = useProjectsStore();
const { totalCount, completedCount, completionRatio, targetAllCompletionDate, workloadByDev, projects, velocityData, averageCycleDays, throughputPerBusinessDay, remainingCount, forecastCompletionDate, requiredVelocityToHitTarget, isTargetRisk, burnDownData, mvpDev, wipLimits } = storeToRefs(store);
// Note: access these getters directly via store to avoid undefined refs during hot loads
// mvpDevThisMonth, mvpDevLast7Days, devStats, devStatsThisMonth, devStatsLast7Days

const targetDateLocal = ref(targetAllCompletionDate.value);

const fallbackStats = { completed: 0, throughput: 0, avgCycle: null, active: 0, onTimeRate: null };

const mvpNameOverall = computed(()=> store.mvpDev);
const mvpNameMonth = computed(()=> store.mvpDevThisMonth);
const mvpName7d = computed(()=> store.mvpDevLast7Days);

const mvpStatsOverall = computed(()=> {
  const dev = mvpNameOverall.value;
  const stats = store.devStats || {};
  return dev && stats?.[dev] ? stats[dev] : fallbackStats;
});
const mvpStatsMonth = computed(()=> {
  const dev = mvpNameMonth.value;
  const stats = store.devStatsThisMonth || {};
  return dev && stats?.[dev] ? stats[dev] : fallbackStats;
});
const mvpStats7d = computed(()=> {
  const dev = mvpName7d.value;
  const stats = store.devStatsLast7Days || {};
  return dev && stats?.[dev] ? stats[dev] : fallbackStats;
});

function saveTarget() { store.setTargetDate(targetDateLocal.value); }

// user pref: show sparklines
const showSparklines = useStorage('pref_show_sparklines', true);

// Tab state for graphs (persisted)
const graphTabs = [
  { key: 'burndown', label: 'Burn Down' },
  { key: 'throughput', label: 'Throughput' },
  { key: 'velocity', label: 'Velocity' }
];
const activeGraphTab = useStorage('dashboard_graph_tab', 'burndown');
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

// Real micro-series derived from store data
const lastN = (arr, n) => (arr || []).slice(Math.max((arr || []).length - n, 0));
// Started projects cumulative series (increments on startedAt days)
const sparkStarted = computed(() => {
  const map = {};
  (projects.value || []).forEach(p => {
    if (p && p.startedAt) {
      const d = String(p.startedAt).slice(0,10);
      map[d] = (map[d] || 0) + 1;
    }
  });
  const days = Object.keys(map).sort();
  let cum = 0;
  const vals = days.map(d => { cum += map[d]; return cum; });
  return lastN(vals, 12);
});
const sparkCompleted = computed(() => lastN(velocityData.value.map(p=>p.value), 12));
const sparkCompletionPct = computed(() => {
  const total = totalCount.value || 1;
  return lastN(velocityData.value.map(p => (p.value/total)*100), 12);
});
const sparkRemaining = computed(() => {
  const f = burnDownData.value?.forecast || [];
  const numeric = f.filter(v => typeof v === 'number');
  return lastN(numeric, 12);
});
const sparkAvgCycle = computed(() => {
  // approximate with 7-day rolling inverse slope of velocity
  const vals = velocityData.value.map((p,i,arr) => {
    const prev = i>0 ? arr[i-1].value : 0;
    return Math.max(0, arr[i].value - prev);
  });
  return lastN(vals, 12);
});
const sparkThroughput = computed(() => {
  const vals = velocityData.value.map((p,i,arr) => {
    const prev = i>0 ? arr[i-1].value : 0;
    return +(Math.max(0, arr[i].value - prev)).toFixed(2);
  });
  return lastN(vals, 12);
});
const sparkNeeded = computed(() => {
  // needed/day trend from historical required velocity; here sample as ratio of remaining over day count left for each label
  const labels = burnDownData.value?.labels || [];
  const actual = burnDownData.value?.actual || [];
  const out = [];
  for (let i=0;i<labels.length;i++){
    const rem = actual[i];
    if (typeof rem !== 'number') continue;
    const daysLeft = Math.max(1, (labels.length - 1 - i));
    out.push(rem / daysLeft);
  }
  return lastN(out, 12);
});

// Tooltip text for risk icon
const riskTooltipText = computed(() => {
  const fc = forecastCompletionDate.value || 'unknown';
  const tg = targetAllCompletionDate.value || 'unknown';
  const req = (requiredVelocityToHitTarget.value === Infinity) ? '∞' : (requiredVelocityToHitTarget.value || 0);
  return `Forecast completion (${fc}) exceeds target (${tg}). Increase throughput to ~${req} / business day.`;
});

// Conditional icon colors for throughput and needed
const throughputColorClass = computed(() => {
  const throughput = Number(throughputPerBusinessDay.value);
  const needed = Number(requiredVelocityToHitTarget.value);

  if (!isFinite(needed) || needed <= 0) return '#10B981'; // Green for no required velocity
  if (throughput >= needed) return '#10B981'; // Green if throughput meets or exceeds needed
  return '#EF4444'; // Red if throughput is below needed
});

const neededColorClass = computed(() => {
  const needed = Number(requiredVelocityToHitTarget.value);

  if (!isFinite(needed) || needed <= 0) return '#10B981'; // Green for no required velocity
  if (isTargetRisk.value) return '#F59E0B'; // Amber if target is at risk
  return '#64748B'; // Slate for neutral state
});

// Color classes for sparklines
const completedColorClass = computed(() => '#10B981'); // Example logic for completed
const completionPctColorClass = computed(() => '#3B82F6'); // Example logic for completion percentage
const remainingColorClass = computed(() => '#64748B'); // Example logic for remaining
const avgCycleColorClass = computed(() => '#94A3B8'); // Example logic for average cycle
const totalProjectsColorClass = computed(() => '#8B5CF6'); // Color for total projects started trend (purple)

// Combined velocity data for chart (enhanced)
const velocityChartData = computed(() => {
  const labels = burnDownData.value?.labels || [];
  const actualRemaining = burnDownData.value?.actual || [];
  const idealAbsolute = burnDownData.value?.idealAbsolute || [];

  if (!labels.length) return { labels: [], daily: [], ma7: [], cumActual: [], cumIdeal: [], requiredPerDay: 0, avgPerDay: 0, today: new Date().toISOString().slice(0,10), targetDate: targetAllCompletionDate.value, forecastDate: forecastCompletionDate.value };

  // total work assumed from first idealAbsolute value (remaining at start)
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

  // 7-day simple moving average over daily (calendar days)
  const window = 7;
  const ma7 = daily.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = daily.slice(start, i + 1);
    const sum = slice.reduce((a,b)=>a+b,0);
    return +(sum / slice.length).toFixed(3);
  });

  return {
    labels: labels.map(d => new Date(d).toISOString().split('T')[0]),
    daily,
    ma7,
    cumActual: cumActual.map(v => v ?? null),
    cumIdeal: cumIdeal.map(v => v ?? null),
    requiredPerDay: (requiredVelocityToHitTarget.value === Infinity) ? null : +(+requiredVelocityToHitTarget.value).toFixed(3),
    avgPerDay: +(+throughputPerBusinessDay.value || 0).toFixed(3),
    today: new Date().toISOString().slice(0,10),
    targetDate: targetAllCompletionDate.value,
    forecastDate: forecastCompletionDate.value || null
  };
});

// Replace previous devSparkData logic with raw + MA7 + helpers
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
    const slice = days.slice(-12); // last up to 12 days
    out[dev] = slice.map(d => ({ date: d, count: dayCounts[d] }));
  });
  return out;
});
const devSparkMA7 = computed(() => {
  const out = {};
  (store.developers || []).forEach(dev => {
    const raw = devSparkRawRecent.value[dev] || [];
    const nums = raw.map(r => r.count);
    out[dev] = nums.map((_, i) => {
      const start = Math.max(0, i - 6);
      const window = nums.slice(start, i + 1);
      const avg = window.reduce((a,b)=>a+b,0) / window.length;
      return +avg.toFixed(2);
    });
  });
  return out;
});
function devSparkColor(dev){
  const stats = store.devStats?.[dev];
  if (!stats || !stats.throughput){ return '#94A3B8'; }
  const needed = requiredVelocityToHitTarget.value;
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
