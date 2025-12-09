<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-medium text-slate-800">Monthly Go-Lives</h4>
      <div class="text-[11px] text-slate-600">Oldest → Newest</div>
    </div>
    <div class="flex items-center gap-3 mb-2 text-[11px] text-slate-700">
      <span class="inline-flex items-center gap-1"><span class="w-3 h-3 inline-block rounded-sm" style="background:#10B981"></span> Migration</span>
      <span class="inline-flex items-center gap-1"><span class="w-3 h-3 inline-block rounded-sm" style="background:#F59E0B"></span> Newbuild</span>
      <span class="inline-flex items-center gap-1"><span class="w-3 h-3 inline-block rounded-sm" style="background:#3B82F6"></span> Current Month Highlight</span>
    </div>
    <svg :width="width" :height="height" role="img" aria-label="Monthly go-live counts" class="w-full">
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- stacked bars: migration bottom, newbuild above; edge highlight for current -->
        <g v-for="(bar, i) in bars" :key="i">
          <rect :x="bar.x" :y="bar.yMig" :width="bar.w" :height="bar.hMig" :fill="bar.fillMig" rx="4" />
          <rect :x="bar.x" :y="bar.yNew" :width="bar.w" :height="bar.hNew" :fill="bar.fillNew" rx="4" />
          <rect v-if="bar.isCurrent" :x="bar.x" :y="bar.yTotal" :width="bar.w" :height="bar.hTotal" fill="transparent" stroke="#3B82F6" stroke-width="2" rx="5" />
        </g>
        <!-- labels -->
        <text v-for="(tick,i) in xTicks" :key="'x-'+i" :x="tick.x" :y="innerH + 18" text-anchor="middle"
              class="fill-slate-600" font-size="11">{{ tick.label }}</text>
        <text v-for="(lab,i) in barLabels" :key="'v-'+i" :x="lab.x" :y="lab.y" text-anchor="middle"
              class="fill-slate-700" font-size="11" font-weight="600">{{ lab.text }}</text>
      </g>
    </svg>
  </div>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({
  // data: [{ label, migrationCount, newbuildCount, isCurrent }]
  data: { type: Array, default: () => [] },
  width: { type: Number, default: 720 },
  height: { type: Number, default: 220 }
});
const margin = { top: 10, right: 12, bottom: 28, left: 12 };
const innerW = computed(() => props.width - margin.left - margin.right);
const innerH = computed(() => props.height - margin.top - margin.bottom - 8);
const max = computed(() => Math.max(1, ...props.data.map(d => (d.migrationCount||0)+(d.newbuildCount||0))));
const gap = 10;
const barW = computed(() => {
  const n = Math.max(props.data.length, 1);
  return Math.max(14, (innerW.value - gap * (n - 1)) / n);
});
const bars = computed(() => {
  let x = 0; const arr = [];
  props.data.forEach((d) => {
    const total = (d.migrationCount||0)+(d.newbuildCount||0);
    const hTotal = Math.round((total / max.value) * innerH.value);
    const hMig = Math.round(((d.migrationCount||0) / max.value) * innerH.value);
    const hNew = Math.max(0, hTotal - hMig);
    const yTotal = innerH.value - hTotal;
    const yMig = innerH.value - hMig;
    const yNew = yTotal; // stack newbuild above migration
    const fillMig = '#10B981';
    const fillNew = '#F59E0B';
    arr.push({ x, w: barW.value, hTotal, yTotal, hMig, yMig, hNew, yNew, fillMig, fillNew, isCurrent: !!d.isCurrent });
    x += barW.value + gap;
  });
  return arr;
});
const xTicks = computed(() => {
  let x = 0; const arr = [];
  props.data.forEach((d) => {
    arr.push({ x: x + barW.value/2, label: d.label });
    x += barW.value + gap;
  });
  return arr;
});
const barLabels = computed(() => {
  let x = 0; const arr = [];
  props.data.forEach((d) => {
    const total = (d.migrationCount||0)+(d.newbuildCount||0);
    const hTotal = Math.round((total / max.value) * innerH.value);
    const y = innerH.value - hTotal - 6;
    arr.push({ x: x + barW.value/2, y, text: String(total) });
    x += barW.value + gap;
  });
  return arr;
});
</script>
<style scoped>
svg { display: block; }
</style>
