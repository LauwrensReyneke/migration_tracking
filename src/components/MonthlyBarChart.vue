<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-medium text-slate-800">Monthly Go-Lives</h4>
      <div class="text-[11px] text-slate-600">Newest → Oldest</div>
    </div>
    <svg :width="width" :height="height" role="img" aria-label="Monthly go-live counts" class="w-full">
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <rect v-for="(bar, i) in bars" :key="i"
              :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h"
              :fill="bar.fill" rx="4" />
        <!-- labels -->
        <text v-for="(tick,i) in xTicks" :key="'x-'+i" :x="tick.x" :y="innerH + 14" text-anchor="middle"
              class="fill-slate-600" font-size="10">{{ tick.label }}</text>
        <text v-for="(lab,i) in barLabels" :key="'v-'+i" :x="lab.x" :y="lab.y" text-anchor="middle"
              class="fill-slate-700" font-size="10" font-weight="600">{{ lab.text }}</text>
      </g>
    </svg>
  </div>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ label, count, isCurrent }]
  width: { type: Number, default: 600 },
  height: { type: Number, default: 180 }
});
const margin = { top: 10, right: 10, bottom: 22, left: 10 };
const innerW = computed(() => props.width - margin.left - margin.right);
const innerH = computed(() => props.height - margin.top - margin.bottom - 12);
const max = computed(() => Math.max(1, ...props.data.map(d => d.count || 0)));
const gap = 8;
const barW = computed(() => {
  const n = Math.max(props.data.length, 1);
  return Math.max(12, (innerW.value - gap * (n - 1)) / n);
});
const bars = computed(() => {
  let x = 0; const arr = [];
  props.data.forEach((d) => {
    const h = Math.round((d.count / max.value) * innerH.value);
    const y = innerH.value - h;
    const fill = d.isCurrent ? '#3B82F6' : '#10B981';
    arr.push({ x, y, w: barW.value, h, fill });
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
    const h = Math.round((d.count / max.value) * innerH.value);
    const y = innerH.value - h - 4;
    arr.push({ x: x + barW.value/2, y, text: String(d.count) });
    x += barW.value + gap;
  });
  return arr;
});
</script>
<style scoped>
svg { display: block; }
</style>

