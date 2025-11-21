<template>
  <form @submit.prevent="submit">
    <div class="space-y-3">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Name</label>
        <input v-model="name" required placeholder="Project name" class="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Type</label>
          <select v-model="type" class="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="migration">Migration</option>
            <option value="newbuild">New Build</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Assignee</label>
          <select v-model="assignedDev" class="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="">Unassigned</option>
            <option v-for="d in developers" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Target days</label>
          <input v-model.number="targetDays" type="number" min="1" class="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
        </div>
        <div></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Started (optional)</label>
          <input v-model="startedAtDate" type="date" class="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Completed (optional)</label>
          <input v-model="completedAtDate" type="date" class="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
        </div>
      </div>
    </div>
    <div class="mt-4 flex items-center justify-end gap-2">
      <button type="button" class="px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">Add</button>
    </div>
  </form>
</template>
<script setup>
import { ref, computed } from 'vue';
import { useProjectsStore } from '../stores/projects';

const props = defineProps({ stage: { type: String, required: false } });
const emit = defineEmits(['done','cancel']);

const store = useProjectsStore();
const developers = computed(()=> store.developers);

const name = ref('');
const type = ref('migration');
// Default to unassigned; user may pick a dev
const assignedDev = ref('');
const targetDays = ref(4);
const startedAtDate = ref('');
const completedAtDate = ref('');

function toISO(dateStr){
  if (!dateStr) return null;
  const sp = String(dateStr).split('-');
  if (sp.length !== 3) return null;
  const d = new Date(Number(sp[0]), Number(sp[1]) - 1, Number(sp[2]), 12, 0, 0);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function submit(){
  if (!name.value) return;
  const startedAt = toISO(startedAtDate.value) || (props.stage && props.stage !== 'planning' ? new Date().toISOString() : null);
  const completedAt = toISO(completedAtDate.value) || null;
  if (startedAt && completedAt && new Date(completedAt) < new Date(startedAt)) {
    alert('Completed date cannot be before Started date');
    return;
  }
  const id = store.addProject({
    name: name.value,
    type: type.value,
    assignedDev: assignedDev.value,
    targetDays: targetDays.value,
    startedAt,
    completedAt
  });
  if (id && props.stage) store.updateProject(id, { stage: props.stage });
  emit('done', id);
}
</script>
