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
    animations: { enabled: true, speed: 600, easing: 'easeinout' },
    dropShadow: { enabled: true, top: 2, left: 0, blur: 8, color: '#0f172a22' },
    foreColor: '#64748B',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system',
    sparkline: { enabled: false }
  },
  legend: {
    position: 'top',
    fontSize: '11px',
    labels: { colors: '#334155' },
    markers: { width: 8, height: 8, radius: 3 }
  },
  colors: ['#3B82F6', '#10B981'],
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.15,
      gradientToColors: ['#60A5FA', '#34D399'],
      inverseColors: false,
      opacityFrom: 0.95,
      opacityTo: 0.85,
      stops: [0, 100]
    }
  },
  grid: {
    strokeDashArray: 3,
    borderColor: '#E5E7EB',
    padding: { left: 12, right: 12, top: 6, bottom: 0 }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '52%',
      borderRadius: 10,
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
      padding: 6,
      borderRadius: 8,
      opacity: 0.92,
      dropShadow: { enabled: false },
      borderWidth: 0
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
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      const label = w.config.xaxis.categories[dataPointIndex];
      const migration = mig.value[dataPointIndex] || 0;
      const newSite = nw.value[dataPointIndex] || 0;
      const total = migration + newSite;
      const isCurrent = isCurrentIdx.value === dataPointIndex;
      return `
        <div style="min-width:160px;padding:10px 12px;border-radius:12px;background:#ffffff;box-shadow:0 6px 24px rgba(15,23,42,0.12);border:1px solid #eef2f7;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-weight:600;color:#0f172a;font-size:12px;">${label}</span>
            ${isCurrent ? '<span style="font-size:10px;color:#10B981;background:#ECFDF5;border:1px solid #D1FAE5;padding:2px 6px;border-radius:9999px;">Current</span>' : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#334155;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:3px;background:#3B82F6;display:inline-block;"></span>
              <span>Migration</span>
              <span style="margin-left:auto;font-weight:600;color:#0f172a;">${migration}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:3px;background:#10B981;display:inline-block;"></span>
              <span>New Site</span>
              <span style="margin-left:auto;font-weight:600;color:#0f172a;">${newSite}</span>
            </div>
            <div style="margin-top:6px;border-top:1px dashed #e5e7eb;padding-top:6px;display:flex;align-items:center;gap:6px;">
              <span style="color:#64748B;">Total</span>
              <span style="margin-left:auto;font-weight:700;color:#0f172a;">${total}</span>
            </div>
          </div>
        </div>`;
    }
  },
  states: {
    normal: { filter: { type: 'none' } },
    hover: { filter: { type: 'lighten', value: 0.08 } },
    active: { allowMultipleDataPointsSelection: false, filter: { type: 'darken', value: 0.1 } }
  },
  annotations: {
    xaxis: (isCurrentIdx.value !== -1 && labels.value[isCurrentIdx.value]) ? [{
      x: labels.value[isCurrentIdx.value],
      borderColor: '#0ea5e9',
      label: {
        borderColor: 'transparent',
        style: {
          color: '#0ea5e9',
          background: 'transparent',
          fontSize: '0px'
        },
        text: ''
      }
    }] : []
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
  },
  responsive: [
    {
      breakpoint: 768,
      options: {
        plotOptions: { bar: { columnWidth: '60%', borderRadius: 8 } },
        dataLabels: { style: { fontSize: '10px' }, offsetY: -12 },
        grid: { padding: { left: 8, right: 8 } }
      }
    },
    {
      breakpoint: 480,
      options: {
        plotOptions: { bar: { columnWidth: '65%', borderRadius: 8 } },
        dataLabels: { style: { fontSize: '10px' }, offsetY: -10 },
        legend: { fontSize: '10px' }
      }
    }
  ]
}));
</script>
<script>
export default {
  name: 'MonthlyGoLives'
};
</script>
