<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-medium text-slate-800">Monthly Go-Lives</h4>
      <div class="text-[11px] text-slate-600">Oldest → Newest</div>
    </div>
    <apexchart type="bar" :options="options" :series="series" :height="height" />
  </div>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({
  // data: [{ label, migrationCount, newbuildCount, isCurrent }]
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 260 }
});

const labels = computed(() => props.data.map(d => d.label));
const mig = computed(() => props.data.map(d => d.migrationCount || 0));
const nw = computed(() => props.data.map(d => d.newbuildCount || 0));
const isCurrentIdx = computed(() => props.data.findIndex(d => d.isCurrent));

const series = computed(() => ([
  { name: 'Migration', data: mig.value },
  { name: 'New Site', data: nw.value }
]));

const options = computed(() => ({
  chart: {
    stacked: true,
    toolbar: { show: false },
    animations: { enabled: true, speed: 500, easing: 'easeinout' },
    dropShadow: { enabled: true, top: 2, left: 0, blur: 6, color: '#0f172a22' }
  },
  legend: {
    position: 'top',
    fontSize: '11px',
    labels: { colors: '#334155' },
    markers: { width: 8, height: 8, radius: 3 }
  },
  colors: ['#3B82F6', '#10B981'],
  grid: { strokeDashArray: 2, borderColor: '#E5E7EB', padding: { left: 8, right: 8 } },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '45%',
      borderRadius: 8,
      borderRadiusApplication: 'around',
      dataLabels: { position: 'top' }
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val, opts) => {
      const i = opts.dataPointIndex;
      const total = (mig.value[i]||0) + (nw.value[i]||0);
      return total > 0 ? String(total) : '';
    },
    style: { colors: ['#0f172a'], fontSize: '11px', fontWeight: 700 },
    offsetY: -14,
    background: {
      enabled: true,
      foreColor: '#0f172a',
      padding: 4,
      borderRadius: 6,
      opacity: 0.85,
      dropShadow: { enabled: false },
      borderWidth: 0,
    }
  },
  xaxis: {
    categories: labels.value,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#64748B', fontSize: '11px' } },
    tooltip: { enabled: false }
  },
  yaxis: { show: false },
  tooltip: {
    theme: 'light',
    fillSeriesColor: false,
    y: {
      formatter: (val, { dataPointIndex }) => {
        const total = (mig.value[dataPointIndex]||0) + (nw.value[dataPointIndex]||0);
        return `${val} (${total} total)`;
      }
    }
  },
  states: {
    normal: { filter: { type: 'none' } },
    hover: { filter: { type: 'lighten', value: 0.05 } },
    active: { allowMultipleDataPointsSelection: false, filter: { type: 'darken', value: 0.05 } }
  },
  markers: {
    size: 0,
    discrete: isCurrentIdx.value !== -1 ? [{
      seriesIndex: 0,
      dataPointIndex: isCurrentIdx.value,
      fillColor: '#111827',
      strokeColor: '#111827',
      size: 0
    }] : []
  }
}));
</script>
<script>
export default {
  name: 'MonthlyGoLives'
};
</script>

