<template>
  <span ref="anchor" class="inline-block align-middle"></span>
  <Teleport to="body">
    <div
        ref="wrapper"
        class="pointer-events-none fixed z-[700] left-1/2 -translate-x-1/2 transition-opacity duration-150"
        :class="visible ? 'opacity-100' : 'opacity-0'"
        :style="{ top: posTop + 'px', left: posLeft + 'px' }"
    >
      <div
          ref="box"
          class="relative z-[710] bg-white/95 backdrop-blur border border-gray-200 shadow-xl rounded-lg px-4 py-3 text-[11px] text-gray-700 min-w-[230px] max-w-[320px]"
      >
        <!-- Header (using DevProfile) -->
        <div class="flex items-center gap-2 mb-2">
          <DevProfile :name="dev" :subtitle="`MVP • ${periodLabel}`" :size="28" />
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
          <!-- Active -->
          <div v-if="stats?.active !== undefined" class="flex items-start gap-1.5">
            <Fa icon="users" class="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <div>
              <div class="text-gray-500 text-[10px]">Active</div>
              <div class="font-medium text-gray-900 text-[11px]">{{ stats.active }}</div>
            </div>
          </div>

          <!-- Done -->
          <div class="flex items-start gap-1.5">
            <Fa icon="circle-check" class="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <div>
              <div class="text-gray-500 text-[10px]">Done</div>
              <div class="font-medium text-gray-900 text-[11px]">{{ stats?.completed ?? 0 }}</div>
            </div>
          </div>

          <!-- Throughput -->
          <div class="flex items-start gap-1.5">
            <Fa icon="bolt" class="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <div>
              <div class="text-gray-500 text-[10px]">Throughput</div>
              <div class="font-medium text-gray-900 text-[11px]">
                {{ stats?.throughput ?? 0 }}<span class="text-gray-500">/bd</span>
              </div>
            </div>
          </div>

          <!-- Avg Cycle -->
          <div class="flex items-start gap-1.5">
            <Fa icon="clock" class="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <div>
              <div class="text-gray-500 text-[10px]">Avg Cycle</div>
              <div class="font-medium text-gray-900 text-[11px]">
                <template v-if="stats?.avgCycle !== null && stats?.avgCycle !== undefined">
                  {{ stats.avgCycle }}<span class="text-gray-500">d</span>
                </template>
                <template v-else>
                  N/A
                </template>
              </div>
            </div>
          </div>
        </div>


        <!-- On-time -->
        <div class="mt-3">
          <div class="flex items-center justify-between text-[10px] mb-1">
            <div class="flex items-center gap-1.5 text-gray-500">
              <Fa icon="gauge" class="w-3.5 h-3.5" />
              <div>On-time</div>
            </div>
            <div class="font-medium text-gray-900">
              <template v-if="stats?.onTimeRate !== null && stats?.onTimeRate !== undefined">
                {{ stats.onTimeRate }}%
              </template>
              <template v-else>
                N/A
              </template>
            </div>
          </div>
          <div class="h-1.5 bg-gray-100 rounded overflow-hidden" v-if="stats?.onTimeRate !== null && stats?.onTimeRate !== undefined">
            <div
                class="h-1.5 rounded"
                :class="onTimeBarClass"
                :style="{ width: (stats.onTimeRate || 0) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Arrow -->
        <template v-if="place === 'top'">
          <span class="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-gray-200 z-10"></span>
          <span class="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white z-20"></span>
        </template>
        <template v-else>
          <span class="absolute -top-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-gray-200 z-10"></span>
          <span class="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white z-20"></span>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, nextTick, computed} from 'vue';
import DevProfile from './DevProfile.vue';

const props = defineProps({
  dev: {type: String, required: true},
  periodLabel: {type: String, default: 'Overall'},
  stats: {type: Object, default: null},
  placement: { type: String, default: 'auto' } // 'auto' | 'top' | 'bottom'
});
const anchor = ref(null);
const wrapper = ref(null);
const box = ref(null);
const place = ref('top');
const posTop = ref(0);
const posLeft = ref(0);
const visible = ref(false);

const onTimeBarClass = computed(() => {
  const r = Number(props.stats?.onTimeRate || 0);
  if (r >= 80) return 'bg-emerald-500';
  if (r >= 60) return 'bg-amber-500';
  return 'bg-red-500';
});

function computePos(){
  const el = anchor.value;
  if (!el || !box.value) return;
  const rect = el.getBoundingClientRect();
  const tipH = box.value.offsetHeight || 0;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  place.value = (props.placement === 'bottom') ? 'bottom' : (props.placement === 'top') ? 'top' : ((spaceAbove < tipH + 12 && spaceBelow >= spaceAbove) ? 'bottom' : 'top');
  posLeft.value = Math.round(rect.left + rect.width/2);
  posTop.value = place.value === 'top' ? Math.round(rect.top - tipH - 8) : Math.round(rect.bottom + 8);
}

function show(){ visible.value = true; nextTick(computePos); }
function hide(){ visible.value = false; }

function onResize(){ if (visible.value) computePos(); }

onMounted(() => {
  const host = anchor.value?.parentElement;
  if (host) {
    host.addEventListener('mouseenter', show);
    host.addEventListener('mouseleave', hide);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
});

onBeforeUnmount(() => {
  const host = anchor.value?.parentElement;
  if (host) {
    host.removeEventListener('mouseenter', show);
    host.removeEventListener('mouseleave', hide);
  }
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
});
</script>
