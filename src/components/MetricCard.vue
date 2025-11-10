<template>
  <div class="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow p-4 md:p-5">
    <!-- background content (e.g., sparkline) -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="w-full h-full p-2 flex items-end justify-end opacity-80">
        <slot name="bg"></slot>
      </div>
    </div>
    <!-- foreground content -->
    <div class="relative z-10 flex items-start justify-between gap-3">
      <div>
        <div class="text-[11px] uppercase tracking-wider text-slate-500">{{ label }}</div>
        <div class="text-3xl font-semibold leading-tight text-slate-900">{{ value }}</div>
      </div>
      <div class="opacity-80 group-hover:opacity-100 transition-opacity overflow-visible">
        <slot name="icon"></slot>
      </div>
    </div>
    <!-- optional inline content -->
    <div v-if="$slots.default" class="relative z-10 mt-3">
      <slot></slot>
    </div>
  </div>
</template>
<script setup>
defineProps({ label: String, value: [String, Number] });
</script>
