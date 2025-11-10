<template>
  <span :class="classes" class="px-1.5 py-0.5 rounded text-[10px] font-medium inline-block">
    {{ type === 'migration' ? 'MIG' : 'NEW' }}
  </span>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({ type: { type: String, required: true }});
const classes = computed(()=> props.type === 'migration' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700');
</script>
