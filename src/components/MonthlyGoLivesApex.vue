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

const series = computed(() => ([
  { name: 'Migration', data: mig.value },
  { name: 'New Site', data: nw.value }
]));

const options = computed(() => ({
  chart: { stacked: true, toolbar: { show: false }, animations: { enabled: true } },
  legend: { position: 'top', fontSize: '11px', labels: { colors: '#334155' } },
  colors: ['#3B82F6', '#10B981'], // migration blue, new site green
  grid: { strokeDashArray: 3, borderColor: '#E5E7EB' },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '45%',
      borderRadius: 6,
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
    style: { colors: ['#111827'], fontSize: '11px', fontWeight: 600 },
    offsetY: -14
  },
  xaxis: {
    categories: labels.value,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#64748B', fontSize: '11px' } }
  },
  yaxis: { show: false },
  tooltip: {
    y: {
      formatter: (val, { dataPointIndex }) => {
        const total = (mig.value[dataPointIndex]||0) + (nw.value[dataPointIndex]||0);
        return `${val} (${total} total)`;
      }
    }
  }
}));
</script>
<script>
export default {
  name: 'MonthlyGoLivesChart'
};
</script>
