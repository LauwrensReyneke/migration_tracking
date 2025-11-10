<template>
  <div class="min-w-[900px] grid gap-4" :style="gridStyle">
    <div
      v-for="stage in STAGES"
      :key="stage"
      class="group relative rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm ring-1 ring-inset ring-slate-100/70 transition"
      :class="[{ 'ring-2 ring-sky-300/50': dragOver === stage }, wipExceeded(stage) ? 'border-amber-300' : '']"
      @dragover.prevent="onDragOver(stage)"
      @dragleave="onDragLeave(stage)"
      @drop="onDrop(stage)"
    >
      <!-- Column header -->
      <div class="sticky top-0 z-30 -m-3 mb-2 p-3 rounded-t-xl bg-white/70 backdrop-blur-sm border-b border-slate-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-[12px] tracking-wide text-slate-700">{{ STAGE_LABELS[stage] }}</h4>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md border relative"
              :class="wipExceeded(stage) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white/80 text-slate-600 border-slate-200'"
            >
              <span>{{ grouped[stage]?.length || 0 }}</span>
              <span class="text-slate-400">/</span>
              <span>{{ stageWipLimit(stage) === Infinity ? '∞' : stageWipLimit(stage) }}</span>
            </span>
            <!-- header menu for stage WIP edit -->
            <div class="relative" @mouseenter="onMenuEnter(stage)" @mouseleave="onMenuLeave(stage)">
              <button class="px-1.5 py-0.5 text-[11px] rounded-md border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50">⋯</button>
              <div v-if="openMenu===stage" class="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg p-2 z-[1300]">
                <label class="block text-[11px] text-slate-600 mb-1">Stage WIP limit</label>
                <div class="flex items-center gap-1">
                  <input v-model.number="stageLimitsLocal[stage]" type="number" min="0" class="w-20 border border-slate-300 rounded px-2 py-1 text-[11px]" />
                  <button class="px-2 py-1 text-[11px] rounded bg-blue-600 text-white" @click="saveStageLimit(stage)">Save</button>
                </div>
                <div class="mt-1 text-[10px] text-slate-400">0 or empty = unlimited</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column tools (sticky inside scroll area) -->
      <div class="flex-1 overflow-y-auto pb-2 thin-scrollbars" style="max-height: 420px;">
        <div class="sticky top-0 z-10">
          <div class="px-2 pb-2 bg-gradient-to-b from-white/90 to-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <div class="flex items-center justify-between">
              <button
                class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-white/90 shadow-sm hover:bg-slate-50"
                @click="openAdd(stage)"
                :disabled="wipExceeded(stage)"
                :title="wipExceeded(stage) ? 'WIP exceeded — clear items before adding more' : 'Add a card to this stage'"
              >
                <span class="text-slate-600">＋</span>
                <span class="text-slate-700">Add</span>
              </button>
              <span v-if="wipExceeded(stage)" class="text-[10px] text-amber-700 inline-flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                WIP exceeded
              </span>
            </div>
          </div>
        </div>

        <!-- Column content -->
        <div class="space-y-2 px-2 pr-1">
          <div
            v-for="p in grouped[stage]"
            :key="p.id"
            class="group/card relative bg-white border border-slate-200/80 rounded-lg p-3 shadow-[0_1px_0_0_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 ease-out cursor-move overflow-hidden"
            draggable="true"
            @dragstart="onDragStart(p)"
          >
            <!-- hover grip -->
            <div class="absolute left-1.5 top-1.5 h-5 flex items-center opacity-0 group-hover/card:opacity-100 transition-opacity select-none text-slate-300">
              <span aria-hidden="true" class="leading-none text-[14px] tracking-tight">⋮⋮</span>
            </div>

            <div class="flex items-start justify-between gap-2">
              <span class="font-medium text-[12px] leading-5 text-slate-800 truncate" :title="p.name">{{ p.name }}</span>
              <TypeBadge :type="p.type" />
            </div>

            <div class="mt-1 flex items-center justify-between text-[10px] text-slate-500">
              <DevProfile :name="p.assignedDev" :size="18" :showText="true" :nameClass="'text-[10px]'" />
              <div class="inline-flex items-center gap-1">
                <span v-if="p.startedAt && !p.completedAt" class="relative px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70">
                  D+{{ age(p) }}
                  <Tooltip :text="createdTooltip(p)" placement="auto" />
                </span>
                <span v-else-if="p.completedAt && p.stage === 'canceled'" class="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/70">Canceled</span>
                <span v-else-if="p.completedAt" class="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70">Done</span>
              </div>
            </div>

            <!-- progress (age vs targetDays) -->
            <div class="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="progressColorClass(p)"
                :style="{ width: progressPct(p) + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="!(grouped[stage] && grouped[stage].length)" class="mt-1">
            <div class="border border-dashed border-slate-300/70 rounded-lg p-4 text-center text-[11px] text-slate-400 bg-white/50">Empty</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add project modal -->
    <Modal :open="addOpen" title="Add Project" @close="closeAdd">
      <ProjectAddForm :stage="addStage" @done="closeAdd" @cancel="closeAdd" />
    </Modal>
  </div>
</template>
<script setup>
import { computed, ref, reactive, watchEffect } from 'vue';
import { useProjectsStore, STAGES, STAGE_LABELS } from '../stores/projects';
import TypeBadge from './partials/TypeBadge.vue';
import DevProfile from './DevProfile.vue';
import Tooltip from './Tooltip.vue';
import Modal from './Modal.vue';
import ProjectAddForm from './ProjectAddForm.vue';
import { differenceInBusinessDays, parseISO, formatDistanceToNowStrict, format } from 'date-fns';

const props = defineProps({ projects: { type: Array, required: true } });
const store = useProjectsStore();

const openMenu = ref(null);
let menuCloseTimer = null;
function onMenuEnter(stage){
  if (menuCloseTimer) { clearTimeout(menuCloseTimer); menuCloseTimer = null; }
  openMenu.value = stage;
}
function onMenuLeave(stage){
  if (menuCloseTimer) clearTimeout(menuCloseTimer);
  menuCloseTimer = setTimeout(() => {
    if (openMenu.value === stage) openMenu.value = null;
  }, 350);
}

const stageLimitsLocal = reactive({});
watchEffect(() => {
  // seed local copy from store; undefined/<=0 treated as unlimited
  STAGES.forEach(s => {
    const v = Number(store.stageWipLimits?.[s]);
    stageLimitsLocal[s] = Number.isFinite(v) && v > 0 ? v : 0;
  });
});

function saveStageLimit(stage){
  const v = Number(stageLimitsLocal[stage]);
  store.setStageWipLimit(stage, v);
  openMenu.value = null;
}

const grouped = computed(() => {
  const g = {};
  STAGES.forEach(s => g[s] = []);
  props.projects.forEach(p => { g[p.stage]?.push(p); });
  return g;
});

function age(p){ return differenceInBusinessDays(new Date(), parseISO(p.startedAt || p.createdAt)); }
const gridStyle = { gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))` };

// Progress helpers (age vs targetDays)
function progressPct(p){
  if (p.completedAt) return 100;
  if (!p.startedAt) return 0;
  const tgt = Math.max(Number(p.targetDays)||0, 1);
  const a = Math.max(age(p), 0);
  return Math.min(100, Math.round((a / tgt) * 100));
}
function progressColorClass(p){
  const pct = progressPct(p);
  if (p.completedAt) return 'bg-emerald-500';
  if (pct < 80) return 'bg-emerald-500';
  if (pct <= 100) return 'bg-amber-400';
  return 'bg-rose-500';
}

// WIP helpers (stage-based limits from store)
function stageWipLimit(stage){
  const v = Number(store.stageWipLimits?.[stage]);
  return !Number.isFinite(v) || v <= 0 ? Infinity : v;
}
function wipExceeded(stage){
  const count = grouped.value[stage]?.length || 0;
  const lim = stageWipLimit(stage);
  return Number.isFinite(lim) && count > lim;
}
function limitDisplay(stage){
  const lim = stageWipLimit(stage);
  return lim === Infinity ? '∞' : lim;
}

// Tooltip for created timestamp on D+n chip
function createdTooltip(p){
  const created = p.createdAt ? parseISO(p.createdAt) : null;
  if (!created) return '';
  const rel = formatDistanceToNowStrict(created, { addSuffix: true });
  const abs = format(created, 'yyyy-MM-dd HH:mm');
  return `Created ${rel} • ${abs}`;
}

const dragOver = ref(null);
let draggingId = null;
function onDragStart(p){ draggingId = p.id; }
function onDragOver(stage){ dragOver.value = stage; }
function onDragLeave(stage){ if (dragOver.value === stage) dragOver.value = null; }
function onDrop(stage){
  if (draggingId != null) { store.moveToStage(draggingId, stage); }
  dragOver.value = null; draggingId = null;
}

// Add modal wiring
const addOpen = ref(false);
const addStage = ref(null);
function openAdd(stage){ if (stage === 'production' || stage === 'canceled') return; addStage.value = stage; addOpen.value = true; }
function closeAdd(){ addOpen.value = false; addStage.value = null; }
</script>
