<template>
  <div class="flex items-center gap-2" :class="wrapperClass">
    <div
      class="rounded-full text-white font-semibold flex items-center justify-center select-none shrink-0"
      :style="avatarStyle"
      :title="name || 'Unassigned'"
    >
      {{ initials }}
    </div>
    <div class="truncate" v-if="showText">
      <div class="font-medium text-gray-900 truncate" :class="nameClass">{{ name || 'Unassigned' }}</div>
      <div v-if="subtitle" class="text-gray-500" :class="subtitleClass">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: false, default: '' },
  subtitle: { type: String, default: null },
  // Pixel size of the avatar circle
  size: { type: Number, default: 28 },
  // Control text visibility (for very compact places)
  showText: { type: Boolean, default: true },
  // Optional classes to tweak typography externally
  nameClass: { type: String, default: 'text-[11px]' },
  subtitleClass: { type: String, default: 'text-[10px]' },
  wrapperClass: { type: String, default: '' },
})

const PALETTE = [
    'oklch(70.5% 0.213 47.604)',
    'oklch(76.9% 0.188 70.08)',
    'oklch(79.5% 0.184 86.047)',
    'oklch(76.8% 0.233 130.85)',
    'oklch(72.3% 0.219 149.579)',
    'oklch(69.6% 0.17 162.48)',
    'oklch(70.4% 0.14 182.503)',
    'oklch(71.5% 0.143 215.221)',
    'oklch(68.5% 0.169 237.323)',
    'oklch(62.3% 0.214 259.815)',
    'oklch(58.5% 0.233 277.117)',
    'oklch(60.6% 0.25 292.717)',
    'oklch(62.7% 0.265 303.9)',
    'oklch(66.7% 0.295 322.15)',
    'oklch(65.6% 0.241 354.308)',
    'oklch(64.5% 0.246 16.439)',
]

function nameToColorHex(str) {
  const input = String(str || '')
  if (!input) return '#6b7280' // fallback gray
  // FNV-1a 32-bit hash
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const idx = (hash >>> 0) % PALETTE.length
  return PALETTE[idx]
}

const initials = computed(() => {
  const parts = String(props.name || '').trim().split(/\s+/).slice(0, 2)
  const chars = parts.map(p => p.charAt(0).toUpperCase()).join('')
  return chars || 'UN'
})

const colorHex = computed(() => nameToColorHex(String(props.name || '')))

const avatarStyle = computed(() => ({
  backgroundColor: colorHex.value,
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(9, Math.round(props.size * 0.4))}px`,
  lineHeight: 1,
}))

const showText = computed(() => props.showText)
</script>
