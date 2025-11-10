<template>
  <div class="relative">
    <apexchart ref="chartRef" :options="chartOptions" :series="series" type="area" height="300"></apexchart>
    <div class="flex flex-nowrap whitespace-nowrap overflow-x-auto justify-center items-center gap-4 -mt-4 px-2 select-none">
      <button
        v-for="(item, idx) in legendItems"
        :key="item.name"
        type="button"
        class="inline-flex items-center gap-2 text-xs"
        @click="onLegendToggle(item, idx)"
      >
        <span class="inline-block w-3 h-3 rounded-full border border-white/50 shadow"
              :style="{ backgroundColor: item.color, opacity: item.active ? 1 : 0.35 }"></span>
        <span :class="item.active ? 'text-slate-700' : 'text-slate-400 line-through'">{{ item.name }}</span>
      </button>
    </div>
    <p class="text-sm text-gray-500 mt-4">The Burn Down chart shows the remaining work over time. Ideally, the actual line should stay below the ideal line to indicate progress is on track.</p>
    <p class="text-xs text-gray-400 mt-1">Data points for ideal, actual, and forecast should be provided as arrays of numbers. Ensure that the arrays are of the same length and correspond to the same time intervals.</p>
  </div>
</template>
<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({ data: { type: Object, required: true } });

const chartRef = ref(null);
const rawSeries = ref([]);
const series = ref([]);
// Default: show Anchored, hide Absolute, show Actual and Forecast
const legendActive = ref([false, true, true, true]); // Anchored hidden, Absolute shown by default

const chartOptions = ref({
  chart: { id: 'burnDownChart', type: 'area', toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 800 } },
  grid: { padding: { bottom: 12 } },
  xaxis: {
    type: 'datetime', tickPlacement: 'on', tickAmount: 8, axisTicks: { show: true }, axisBorder: { show: true },
    labels: { rotate: 0, rotateAlways: false, hideOverlapping: true, trim: true, minHeight: 28, style: { fontFamily: 'Inter, sans-serif', fontSize: '12px' },
      formatter: (value, timestamp) => { try { const d = new Date(timestamp || value); return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); } catch { return value; } } }
  },
  yaxis: { labels: { style: { fontFamily: 'Inter, sans-serif', fontSize: '12px' } } },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.25, gradientToColors: undefined, inverseColors: true, opacityFrom: 0.5, opacityTo: 0, stops: [0, 90, 100] } },
  markers: { size: 0 },
  dataLabels: { enabled: false },
  colors: ['#93C5FD', '#2563EB', '#10B981', '#F59E0B'],
  tooltip: { theme: 'dark', x: { format: 'dd MMM yyyy' } },
  legend: { show: false }
});

function withVisibility(built) {
  return built.map((s, i) => {
    if (legendActive.value[i]) return s;
    const safeData = (s.data || []).map((pt) => ({ x: pt?.x ?? null, y: null }));
    return { ...s, data: safeData };
  });
}

watch(() => props.data, () => {
  const { labels = [], actual = [], ideal = [], idealAbsolute = [], forecast = [], today, targetDate, forecastDate } = props.data || {};

  const idealAnchored = labels.map((l, i) => ({ x: l, y: ideal[i] }));
  const idealAbs = labels.map((l, i) => {
    const val = (i < idealAbsolute.length && idealAbsolute[i] !== null && idealAbsolute[i] !== undefined) ? idealAbsolute[i] : (idealAbsolute[idealAbsolute.length - 1] || 0);
    return { x: l, y: val };
  });
  const actualData = labels.map((l, i) => ({ x: l, y: actual[i] }));
  const forecastData = labels.map((l, i) => ({ x: l, y: forecast[i] }));

  rawSeries.value = [
    { name: 'Ideal (Anchored)', data: idealAnchored },
    { name: 'Ideal (Absolute)', data: idealAbs },
    { name: 'Actual Remaining', data: actualData },
    { name: 'Forecast', data: forecastData }
  ];

  // Robust default visibility mapping
  legendActive.value = rawSeries.value.map((_, i) => {
    if (legendActive.value[i] === undefined) {
      // default: show all except Ideal (Anchored) at index 0
      return i === 0 ? false : true;
    }
    return legendActive.value[i];
  });

  series.value = withVisibility(rawSeries.value);

  const targetTicks = labels.length > 0 ? Math.min(8, Math.max(3, Math.floor(labels.length / 6))) : 6;
  const anns = { xaxis: [] };
  const addX = (ds, text, color, dash=4) => { if (!ds) return; const x = new Date(ds).getTime(); anns.xaxis.push({ x, borderColor: color, strokeDashArray: dash, label: { text, style: { color: color === '#F59E0B' ? '#111827' : '#fff', background: color, fontSize: '10px', fontFamily: 'Inter, sans-serif' } } }); };
  addX(today || new Date().toISOString().slice(0,10), 'Today', '#FF4560', 5);
  addX(targetDate, 'Target', '#0EA5E9', 4);
  addX(forecastDate, 'Forecast', '#F59E0B', 4);

  chartOptions.value = { ...chartOptions.value, xaxis: { ...chartOptions.value.xaxis, tickAmount: targetTicks }, annotations: anns };
}, { deep: true, immediate: true });

const legendItems = computed(() => {
  const colors = chartOptions.value.colors || [];
  return (rawSeries.value || []).map((s, i) => ({ name: s.name, color: colors[i] || '#999', active: legendActive.value[i] !== false }));
});

function onLegendToggle(item, idx) {
  if (idx === 0 || idx === 1) {
    const other = idx === 0 ? 1 : 0;
    if (legendActive.value[idx]) {
      // clicked active ideal: deactivate it and activate the other
      legendActive.value[idx] = false;
      legendActive.value[other] = true;
    } else {
      // clicked inactive ideal: activate it and deactivate the other
      legendActive.value[idx] = true;
      legendActive.value[other] = false;
    }
  } else {
    legendActive.value[idx] = !legendActive.value[idx];
  }
  series.value = withVisibility(rawSeries.value);
}
</script>