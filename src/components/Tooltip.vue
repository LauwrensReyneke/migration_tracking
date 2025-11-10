<template>
  <span ref="anchor" class="inline-block align-middle"></span>
  <Teleport to="body">
    <div
      ref="wrapper"
      class="pointer-events-none fixed z-[1200] left-1/2 -translate-x-1/2 transition-opacity duration-150"
      :class="visible ? 'opacity-100' : 'opacity-0'"
      :style="{ top: posTop + 'px', left: posLeft + 'px' }"
    >
      <div
        ref="box"
        class="relative backdrop-blur-sm shadow-xl rounded-lg px-6 py-4 text-[14px] max-w-[360px] bg-white/50"
        :class="containerClasses"
      >
        <slot>
          {{ text }}
        </slot>
        <template v-if="place === 'top'">
          <span
            class="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] z-10"
            :class="arrowOuterClassTop"
          ></span>
          <span
            class="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] z-20"
            :class="arrowInnerClassTop"
          ></span>
        </template>
        <template v-else>
          <span
            class="absolute -top-[9px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[9px] z-10"
            :class="arrowOuterClassBottom"
          ></span>
          <span
            class="absolute -top-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] z-20"
            :class="arrowInnerClassBottom"
          ></span>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';

const props = defineProps({
  text: { type: String, default: '' },
  placement: { type: String, default: 'auto' }, // 'auto' | 'top' | 'bottom'
  variant: { type: String, default: 'default' } // 'default' | 'danger'
});

const anchor = ref(null);
const box = ref(null);
const posTop = ref(0);
const posLeft = ref(0);
const visible = ref(false);
const place = ref('top');

const isDanger = computed(() => props.variant === 'danger');
const containerClasses = computed(() => [
  'border',
  isDanger.value ? 'bg-red-50/90 border-red-200 text-red-700' : 'bg-white/95 border-gray-200 text-gray-700'
]);
const arrowOuterClassTop = computed(() => isDanger.value ? 'border-t-red-200' : 'border-t-gray-200');
const arrowInnerClassTop = computed(() => isDanger.value ? 'border-t-red-50' : 'border-t-white');
const arrowOuterClassBottom = computed(() => isDanger.value ? 'border-b-red-200' : 'border-b-gray-200');
const arrowInnerClassBottom = computed(() => isDanger.value ? 'border-b-red-50' : 'border-b-white');

function computePos(){
  const el = anchor.value;
  const host = el?.parentElement || el;
  if (!host || !box.value) return;
  const rect = host.getBoundingClientRect();
  const tipH = box.value.offsetHeight || 0;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  place.value = (props.placement === 'bottom') ? 'bottom' : (props.placement === 'top') ? 'top' : ((spaceAbove < tipH + 12 && spaceBelow >= spaceAbove) ? 'bottom' : 'top');
  posLeft.value = Math.round(rect.left + rect.width/2);
  posTop.value = place.value === 'top' ? Math.round(rect.top - tipH - 8) : Math.round(rect.bottom + 8);
}

function show(){ visible.value = true; nextTick(computePos); }
function hide(){ visible.value = false; }
function onResize(){ if (visible.value) computePos(); }

onMounted(() => {
  const host = anchor.value?.parentElement;
  if (host) {
    host.addEventListener('mouseenter', show);
    host.addEventListener('mouseleave', hide);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
});

onBeforeUnmount(() => {
  const host = anchor.value?.parentElement;
  if (host) {
    host.removeEventListener('mouseenter', show);
    host.removeEventListener('mouseleave', hide);
  }
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
});
</script>
