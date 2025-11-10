<template>
  <svg :width="w" :height="h" viewBox="0 0 100 24" class="overflow-visible">
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
    <g v-if="showPoints">
      <circle
        v-for="(pt, i) in coords"
        :key="i"
        :cx="pt.x"
        :cy="pt.y"
        :r="pointRadius"
        :fill="pointFill || color"
      />
    </g>
  </svg>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({
  data: { type: Array, default: () => [] },
  color: { type: String, default: '#64748B' },
  strokeWidth: { type: Number, default: 2 },
  w: { type: Number, default: 100 },
  h: { type: Number, default: 24 },
  showPoints: { type: Boolean, default: false },
  pointRadius: { type: Number, default: 1.5 },
  pointFill: { type: String, default: null }
});

const coords = computed(() => {
  const arr = (props.data || []).map(n => Number(n)).filter(n => !isNaN(n));
  if (!arr.length) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const span = Math.max(max - min, 1);
  const dx = 100 / Math.max(arr.length - 1, 1);
  return arr.map((v, i) => {
    const x = i * dx;
    const y = 24 - ((v - min) / span) * 24; // invert y
    return { x, y };
  });
});

const points = computed(() => {
  if (!coords.value.length) return '';
  return coords.value.map(pt => `${pt.x},${pt.y}`).join(' ');
});
</script>
