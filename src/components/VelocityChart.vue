<template>
  <div class="relative">
    <apexchart ref="chartRef" :options="chartOptions" :series="series" type="area" height="320"></apexchart>
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
    <div class="text-xs text-slate-500 mt-4 space-y-1">
      <p class="text-sm text-gray-500 mt-2">
        Velocity shows 7d moving average (green) and cumulative progress vs ideal (blue vs slate).
      </p>
      <p class="text-xs text-gray-400 mt-1">
        Reference lines: Avg/day (solid green) and Needed/day to hit target (amber dashed). Vertical markers show Today, Target, and Forecast.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({ data: { type: Object, required: true } });

const chartRef = ref(null);
const series = ref([]);
const legendActive = ref([]); // mirrors series visibility

const chartOptions = ref({
  chart: { type: 'area', toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 800 } },
  states: { hover: { filter: { type: 'darken', value: 0.8 } }, active: { allowMultipleDataPointsSelection: false, filter: { type: 'none' } } },
  grid: { padding: { bottom: 12 } },
  stroke: { curve: 'smooth', width: 2 },
  markers: { size: 0, hover: { sizeOffset: 3 } },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'datetime',
    tickPlacement: 'on',
    tickAmount: 8,
    axisTicks: { show: true },
    axisBorder: { show: true },
    labels: {
      rotate: 0,
      rotateAlways: false,
      hideOverlapping: true,
      trim: true,
      minHeight: 28,
      style: { fontFamily: 'Inter, sans-serif', fontSize: '12px' },
      formatter: (value, ts) => {
        try { const d = new Date(ts || value); return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); } catch { return value; }
      }
    }
  },
  yaxis: [
    { title: { text: 'Per Day', style: { fontFamily: 'Inter, sans-serif' } }, labels: { style: { fontFamily: 'Inter, sans-serif', fontSize: '12px' } }, decimalsInFloat: 2, min: 0 },
    { opposite: true, title: { text: 'Cumulative', style: { fontFamily: 'Inter, sans-serif' } }, labels: { style: { fontFamily: 'Inter, sans-serif', fontSize: '12px' } }, decimalsInFloat: 0, min: 0 }
  ],
  legend: { show: false },
  tooltip: {
    shared: true,
    intersect: false,
    theme: 'dark',
    x: { format: 'dd MMM yyyy' },
    y: { formatter: (val, { seriesIndex }) => { const num = typeof val === 'number' ? val : Number(val || 0); return (seriesIndex === 0) ? `${num.toFixed(2)} / day` : `${Math.round(num)} total`; } }
  },
  colors: ['#10B981', '#2563EB', '#94A3B8'],
  fill: {
    type: ['gradient', 'gradient', 'gradient'],
    opacity: [0.5, 0.5, 0.3],
    gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.25, gradientToColors: undefined, inverseColors: true, opacityFrom: 0.5, opacityTo: 0, stops: [0, 90, 100] }
  }
});

function buildSeries(d) {
  const labels = d.labels || [];
  const toXY = (arr) => labels.map((l, i) => ({ x: new Date(l).getTime(), y: arr?.[i] ?? null }));
  return [
    { name: '7-day Moving Average', type: 'area', data: toXY(d.ma7 || []), yAxisIndex: 0 },
    { name: 'Cumulative Actual', type: 'area', data: toXY(d.cumActual || []), yAxisIndex: 1 },
    { name: 'Cumulative Ideal', type: 'area', data: toXY(d.cumIdeal || []), yAxisIndex: 1 }
  ];
}

function buildAnnotations(d) {
  const anns = { xaxis: [], yaxis: [] };
  const toX = (ds) => ds ? new Date(ds).getTime() : null;
  const todayX = toX(d.today), targetX = toX(d.targetDate), forecastX = toX(d.forecastDate);
  if (todayX) anns.xaxis.push({ x: todayX, borderColor: '#EF4444', strokeDashArray: 5, label: { text: 'Today', style: { color: '#fff', background: '#EF4444', fontSize: '10px' } } });
  if (targetX) anns.xaxis.push({ x: targetX, borderColor: '#0EA5E9', strokeDashArray: 4, label: { text: 'Target', style: { color: '#fff', background: '#0EA5E9', fontSize: '10px' } } });
  if (forecastX) anns.xaxis.push({ x: forecastX, borderColor: '#F59E0B', strokeDashArray: 4, label: { text: 'Forecast', style: { color: '#111827', background: '#F59E0B', fontSize: '10px' } } });
  if (typeof d.avgPerDay === 'number' && d.avgPerDay > 0) anns.yaxis.push({ y: d.avgPerDay, borderColor: '#10B981', label: { text: `Avg/day ${d.avgPerDay}`, style: { color: '#fff', background: '#10B981', fontSize: '10px' } } });
  if (typeof d.requiredPerDay === 'number' && d.requiredPerDay > 0) anns.yaxis.push({ y: d.requiredPerDay, borderColor: '#F59E0B', strokeDashArray: 6, label: { text: `Needed/day ${d.requiredPerDay}`, style: { color: '#111827', background: '#F59E0B', fontSize: '10px' } } });
  return anns;
}

watch(() => props.data, (d) => {
  const safe = d || {};
  series.value = buildSeries(safe);
  legendActive.value = series.value.map(() => true);
  const labelCount = (safe.labels || []).length;
  const targetTicks = labelCount > 0 ? Math.min(8, Math.max(3, Math.floor(labelCount / 6))) : 6;
  chartOptions.value = {
    ...chartOptions.value,
    xaxis: { ...chartOptions.value.xaxis, tickAmount: targetTicks },
    annotations: buildAnnotations(safe)
  };
}, { deep: true, immediate: true });

const legendItems = computed(() => {
  const colors = chartOptions.value.colors || [];
  return series.value.map((s, i) => ({ name: s.name, color: colors[i] || '#999', active: legendActive.value[i] !== false }));
});

function onLegendToggle(item, idx) {
  legendActive.value[idx] = !legendActive.value[idx];
  try {
    if (chartRef.value && typeof chartRef.value.toggleSeries === 'function') {
      chartRef.value.toggleSeries(item.name);
    } else if (window?.ApexCharts?.exec && chartOptions.value.chart?.id) {
      window.ApexCharts.exec(chartOptions.value.chart.id, 'toggleSeries', item.name);
    }
  } catch (e) { /* noop */ }
}
</script>

<style scoped>
/* Custom legend row under the chart */
button { cursor: pointer; }
</style>
