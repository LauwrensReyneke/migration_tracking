<template>
  <div class="flex items-center gap-2 text-[11px] text-slate-600 px-2 py-1 rounded-md border border-slate-200 bg-white/70">
    <span v-if="hydrated">Projects: <strong>{{ total }}</strong></span>
    <span v-if="hydrated">Devs: <strong>{{ devCount }}</strong></span>
    <span v-if="!hydrated" class="italic">Loading…</span>
  </div>
</template>
<script setup>
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '../stores/projects';
import { computed } from 'vue';
const store = useProjectsStore();
const { projects, developers } = storeToRefs(store);
const total = computed(() => projects.value.length);
const devCount = computed(() => developers.value.length);
const hydrated = computed(() => total.value > 0 || devCount.value > 0);
</script>

