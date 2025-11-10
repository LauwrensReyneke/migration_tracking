<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative w-full sm:max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h4 class="text-sm font-medium text-slate-800">{{ title }}</h4>
          <button class="text-slate-500 hover:text-slate-700 text-sm" @click="$emit('close')">✕</button>
        </div>
        <div class="p-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="px-4 py-3 border-t border-slate-200 bg-slate-50/60">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
<script setup>
const props = defineProps({ open: Boolean, title: { type: String, default: '' } });
</script>

