<template>
  <div class="rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-xl shadow-lg ring-1 ring-slate-200/60 p-5">
    <div class="flex items-center justify-between mb-4 text-[11px] text-slate-600 gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-slate-500/80">Range</span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/60 ring-1 ring-slate-200 text-slate-800 font-normal shadow-sm">{{ fmt(startDate) }}</span>
        <span class="text-slate-400">→</span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/60 ring-1 ring-slate-200 text-slate-800 font-normal shadow-sm">{{ fmt(endDate) }}</span>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Zoom controls (restyled) -->
        <div class="flex items-center gap-2">
          <button @click="zoomOut" type="button" title="Zoom Out"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            −
          </button>
          <div class="text-[10px] w-12 text-center select-none font-mono text-slate-500">{{ dayWidth }}px</div>
          <button @click="zoomIn" type="button" title="Zoom In"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            +
          </button>
        </div>
        <!-- View mode (restyled) -->
        <div class="flex items-center">
          <button
            @click="toggleCompact"
            :aria-pressed="compactMode"
            type="button"
            class="px-3 py-1.5 text-xs rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            :class="compactMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'"
            title="Toggle compact mode"
          >
            Compact
          </button>
        </div>
        <!-- Legend -->
        <div class="flex items-center gap-2 text-[10px] text-slate-600 font-normal">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow ring-1 ring-emerald-500/30"></span>On Time</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow ring-1 ring-amber-500/30"></span>Late Done</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-slate-300 shadow ring-1 ring-slate-400/30"></span>Active</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-rose-400 shadow ring-1 ring-rose-500/30"></span>Overdue</span>
          <span class="flex items-center gap-1"><span class="w-1 h-3 rounded-full bg-red-500"></span>Today</span>
        </div>
      </div>
    </div>

    <!-- Scrollable timeline area (controls above do NOT scroll) -->
    <div class="overflow-x-auto overflow-y-visible" ref="scrollRef">
      <div class="relative" :style="{ width: timelineWidth + 'px' }">
        <!-- Weekend shading layer -->
        <div class="absolute inset-0 grid pointer-events-none" :style="{ gridTemplateColumns: dayColsTemplate }">
          <div v-for="i in totalDays" :key="'wk-'+i" :class="isWeekendCol(i-1) ? 'bg-slate-50/80' : ''"></div>
        </div>
        <!-- Month dividers -->
        <div class="absolute inset-0 grid pointer-events-none" :style="{ gridTemplateColumns: dayColsTemplate }">
          <div v-for="i in totalDays" :key="'m-'+i" class="relative">
            <div v-if="isFirstOfMonth(i-1)" class="absolute inset-y-0 left-0 border-l border-slate-300/70"></div>
          </div>
        </div>
        <!-- Grid columns lines -->
        <div class="absolute inset-0 grid pointer-events-none" :style="{ gridTemplateColumns: dayColsTemplate }">
          <div v-for="i in totalDays" :key="i" class="border-l border-slate-200/40"></div>
        </div>
        <!-- Today marker -->
        <div class="absolute top-0 bottom-0 border-l-2 border-red-500/90 pointer-events-none mix-blend-multiply" :style="{ left: leftFromDate(today) }"></div>

        <!-- Header ticks every N days and month labels -->
        <div class="relative z-10 grid text-[10px] text-slate-500 font-normal tracking-wide" :style="{ gridTemplateColumns: dayColsTemplate }">
          <div v-for="i in totalDays" :key="'h'+i" class="py-1">
            <span v-if="isFirstOfMonth(i-1)" class="text-slate-800 font-semibold">{{ monthLabel(addDays(startDate, i-1)) }}</span>
            <span v-else-if="(i-1)%tickEvery===0" class="opacity-70">{{ headerLabel(addDays(startDate, i-1)) }}</span>
          </div>
        </div>

        <!-- Rows -->
        <div class="relative z-10">
          <div v-for="p in sortedProjects" :key="p.id" :class="['relative', compactMode ? 'h-7' : 'h-9']">
            <div class="relative h-full">
              <div
                class="group absolute rounded-xl flex items-center border border-transparent shadow-sm hover:shadow-md hover:ring-2 hover:ring-slate-900/5 transition z-20 cursor-pointer"
                :class="[compactMode ? 'h-4' : 'h-5', barClass(p)]"
                :style="barStyle(p)"
                :title="p.name"
                @mouseenter="onBarEnter(p, $event)"
                @mousemove="onBarMove($event)"
                @mouseleave="onBarLeave"
              >
                <span :class="[compactMode ? 'text-[10px]' : 'text-[11px]', 'px-2 font-normal tracking-normal whitespace-nowrap overflow-hidden text-ellipsis', barTextClass()]">{{ p.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Smart tooltip (teleported to body to avoid clipping) -->
    <teleport to="body">
      <div
        v-if="tooltip.show && tooltip.p"
        class="fixed z-[1000] pointer-events-none"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', width: tooltip.w + 'px' }"
      >
        <div ref="tooltipRef" class="relative bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-xl rounded-xl px-3 py-2 text-[11px] text-slate-700">
          <div class="font-semibold text-slate-900 text-[11px] max-w-[260px] truncate">{{ tooltip.p.name }}</div>
          <div class="flex items-center gap-2 mt-0.5">
            <DevProfile :name="tooltip.p.assignedDev || 'Unassigned'" :size="18" :showText="true" :nameClass="'text-[10px] font-medium text-slate-700'" />
          </div>
          <div class="text-[10px] mt-0.5 font-mono text-slate-600">{{ fmt(startOf(tooltip.p)) }} → {{ fmt(endOf(tooltip.p)) }} <span class="text-slate-400">· {{ durationDays(tooltip.p) }}d</span></div>
          <div class="text-[10px] flex items-center gap-2 mt-0.5">
            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full" :class="statusDotClass(tooltip.p)"></span>{{ stateLabel(tooltip.p) }}</span>
            <span class="text-slate-400">•</span>
            <span class="uppercase tracking-wide font-semibold text-slate-500">{{ tooltip.p.type }}</span>
          </div>
          <span
            v-if="tooltip.placement === 'top'"
            class="pointer-events-none absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"
          ></span>
          <span
            v-else
            class="pointer-events-none absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white"
          ></span>
        </div>
      </div>
    </teleport>
  </div>
</template>
<script setup>
import { computed, ref, watch, onMounted, nextTick, onUnmounted } from 'vue';
import { parseISO, differenceInCalendarDays, differenceInBusinessDays, addDays, format, isAfter, isBefore, isWeekend, addBusinessDays } from 'date-fns';
import DevProfile from './DevProfile.vue';

// Dynamic day width (zoom)
const MIN_DAY_WIDTH = 6;
const MAX_DAY_WIDTH = 60;
const dayWidth = ref(12); // starting width per requirement

const props = defineProps({
  projects: { type: Array, required: true },
  start: { type: [String, Date], default: null },
  end: { type: [String, Date], default: null },
  defaultTargetDays: { type: Number, default: 4 }
});

const today = new Date();

// UI mode
const compactMode = ref(false);
const tickEvery = computed(() => compactMode.value ? 14 : 7);
function toggleCompact(){ compactMode.value = !compactMode.value; }

// Scroll container ref (only timeline scrolls, not controls)
const scrollRef = ref(null);

// Use projects from props directly
const filteredProjects = computed(() => props.projects || []);

const startDate = computed(()=> {
  if (props.start) return (props.start instanceof Date) ? props.start : parseISO(props.start);
  return defaultStart();
});
const endDate = computed(()=> {
  if (props.end) return (props.end instanceof Date) ? props.end : parseISO(props.end);
  return defaultEnd();
});
const totalDays = computed(()=> Math.max(1, differenceInCalendarDays(endDate.value, startDate.value) + 1));

function defaultStart(){
  if (!filteredProjects.value.length) return addDays(today, -7);
  const earliest = filteredProjects.value.reduce((earliest, p) => {
    const d = parseISO(p.startedAt || p.createdAt);
    return earliest && isBefore(earliest, d) ? earliest : d;
  }, null);
  return earliest || addDays(today, -7);
}
function defaultEnd(){
  if (!filteredProjects.value.length) return addDays(today, 30);
  const latest = filteredProjects.value.reduce((latest, p) => {
    const s = parseISO(p.startedAt || p.createdAt);
    const e = p.completedAt ? parseISO(p.completedAt) : addBusinessDays(s, p.targetDays ?? props.defaultTargetDays);
    return latest && isAfter(latest, e) ? latest : e;
  }, null);
  return latest && isAfter(today, latest) ? today : (latest || addDays(today, 30));
}

const sortedProjects = computed(()=> [...filteredProjects.value].sort((a,b)=>{
  const sa = parseISO(a.startedAt || a.createdAt);
  const sb = parseISO(b.startedAt || b.createdAt);
  if (sa.getTime() !== sb.getTime()) return sa - sb;
  return (a.name||'').localeCompare(b.name||'');
}));

function clampRange(s, e){
  const sClamped = isBefore(s, startDate.value) ? startDate.value : s;
  const eClamped = isAfter(e, endDate.value) ? endDate.value : e;
  return [sClamped, eClamped];
}

function barMetrics(p){
  const w = dayWidth.value;
  const s = parseISO(p.startedAt || p.createdAt);
  const e = p.completedAt ? parseISO(p.completedAt) : today;
  const [cs, ce] = clampRange(s,e);
  const leftDays = Math.max(0, differenceInCalendarDays(cs, startDate.value));
  const durDays = Math.max(1, differenceInCalendarDays(ce, cs) + 1);
  const leftPx = leftDays * w;
  const widthPx = durDays * w;
  return { leftPx, widthPx, durDays };
}
function barStyle(p){
  const { leftPx, widthPx } = barMetrics(p);
  return { left: leftPx + 'px', width: widthPx + 'px' };
}

function expectedEnd(p){
  const s = parseISO(p.startedAt || p.createdAt);
  return addBusinessDays(s, p.targetDays ?? props.defaultTargetDays);
}
function barState(p){
  if (p.stage === 'canceled') return 'canceled';
  const exp = expectedEnd(p);
  if (p.completedAt) {
    const done = parseISO(p.completedAt);
    return isAfter(done, exp) ? 'done_late' : 'done_on_time';
  }
  return isAfter(today, exp) ? 'late' : 'active';
}
function barClass(p){
  const state = barState(p);
  if (state === 'canceled') return 'bg-slate-300 text-slate-600 line-through';
  if (state === 'done_on_time') return 'bg-emerald-400 text-white';
  if (state === 'done_late') return 'bg-amber-400 text-white';
  if (state === 'late') return 'bg-rose-400 text-white';
  return 'bg-slate-300 text-slate-700';
}
function barTextClass(){ return 'text-white/95 drop-shadow-sm'; }

// Tooltip helpers
function startOf(p){ return parseISO(p.startedAt || p.createdAt); }
function endOf(p){ return p.completedAt ? parseISO(p.completedAt) : today; }
function durationDays(p){
  const s = startOf(p), e = endOf(p);
  return Math.max(0, differenceInBusinessDays(e, s));
}
function statusDotClass(p){
  const s = barState(p);
  if (s === 'canceled') return 'bg-slate-500';
  if (s === 'done_on_time') return 'bg-emerald-400';
  if (s === 'done_late') return 'bg-amber-400';
  if (s === 'late') return 'bg-rose-400';
  return 'bg-slate-400';
}
function stateLabel(p){
  const s = barState(p);
  if (s === 'canceled') return 'Canceled';
  if (s === 'done_on_time') return 'Completed On Time';
  if (s === 'done_late') return 'Completed Late';
  return s === 'late' ? 'Overdue' : 'On Track';
}

function fmt(d){ return format(d, 'yyyy-MM-dd'); }
function headerLabel(d){ return format(d, 'MMM d'); }
function monthLabel(d){ return format(d, 'MMM yyyy'); }
function leftFromDate(d){
  const days = Math.max(0, differenceInCalendarDays(d, startDate.value));
  return (days * dayWidth.value) + 'px';
}
function isWeekendCol(idx){ return isWeekend(addDays(startDate.value, idx)); }
function isFirstOfMonth(idx){ return addDays(startDate.value, idx).getDate() === 1; }

const timelineWidth = computed(()=> totalDays.value * dayWidth.value);
const dayColsTemplate = computed(()=> `repeat(${totalDays.value}, ${dayWidth.value}px)`);

function autoScrollToToday(){
  if (!scrollRef.value) return;
  const idx = differenceInCalendarDays(today, startDate.value);
  if (idx < 0) return;
  const targetPx = idx * dayWidth.value;
  const half = scrollRef.value.clientWidth / 2;
  scrollRef.value.scrollLeft = Math.max(0, targetPx - half);
}

function zoomIn(){
  dayWidth.value = Math.min(MAX_DAY_WIDTH, dayWidth.value + (dayWidth.value >= 24 ? 6 : 3));
}
function zoomOut(){
  dayWidth.value = Math.max(MIN_DAY_WIDTH, dayWidth.value - (dayWidth.value > 24 ? 6 : 3));
}

onMounted(()=>{
  autoScrollToToday();
  if (scrollRef.value) scrollRef.value.addEventListener('scroll', handleScrollOrResize, { passive: true });
  window.addEventListener('resize', handleScrollOrResize, { passive: true });
});
watch([startDate, totalDays], ()=> nextTick(()=> autoScrollToToday()));

// Reposition tooltip on scroll/resize
const tooltip = ref({ show: false, p: null, x: 0, y: 0, w: 280, placement: 'top' });
const hoverEl = ref(null);
const tooltipRef = ref(null);
const lastMouseX = ref(null);

function positionTooltipFromEl(el, p, mouseX){
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const padding = 12;
  const gap = 10;
  const width = 280; // fixed width for clamping

  const desiredX = (mouseX ?? lastMouseX.value ?? (rect.left + rect.width / 2));
  const left = Math.max(padding, Math.min(desiredX - width / 2, window.innerWidth - width - padding));

  let estimatedH = 100;
  let place = (rect.top - gap - estimatedH) < padding ? 'bottom' : 'top';
  let y = place === 'bottom' ? (rect.bottom + gap) : (rect.top - gap - estimatedH);

  tooltip.value = { show: true, p, x: Math.round(left), y: Math.round(y), w: width, placement: place };

  nextTick(() => {
    const elTip = tooltipRef.value;
    if (!elTip) return;
    const h = elTip.offsetHeight || estimatedH;

    place = (rect.top - gap - h) < padding ? 'bottom' : 'top';
    y = place === 'bottom' ? (rect.bottom + gap) : (rect.top - gap - h);

    if (place === 'bottom' && (y + h + padding) > window.innerHeight) {
      const topY = rect.top - gap - h;
      if (topY >= padding) {
        place = 'top';
        y = topY;
      } else {
        y = Math.max(padding, Math.min(y, window.innerHeight - h - padding));
      }
    } else {
      y = Math.max(padding, Math.min(y, window.innerHeight - h - padding));
    }

    tooltip.value = { ...tooltip.value, y: Math.round(y), placement: place };
  });
}
function onBarEnter(p, e){
  hoverEl.value = e.currentTarget || e.target;
  lastMouseX.value = e.clientX;
  positionTooltipFromEl(hoverEl.value, p, e.clientX);
}
function onBarMove(e){
  if (!tooltip.value.show) return;
  hoverEl.value = e.currentTarget || e.target;
  lastMouseX.value = e.clientX;
  positionTooltipFromEl(hoverEl.value, tooltip.value.p || null, e.clientX);
}
function onBarLeave(){
  tooltip.value.show = false;
  tooltip.value.p = null;
  hoverEl.value = null;
  lastMouseX.value = null;
}

function handleScrollOrResize(){
  if (!tooltip.value.show || !hoverEl.value) return;
  positionTooltipFromEl(hoverEl.value, tooltip.value.p, lastMouseX.value);
}

onUnmounted(()=>{
  if (scrollRef.value) scrollRef.value.removeEventListener('scroll', handleScrollOrResize);
  window.removeEventListener('resize', handleScrollOrResize);
});
</script>
