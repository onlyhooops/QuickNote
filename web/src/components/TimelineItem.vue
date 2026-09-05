<script setup>
import { onMounted, ref } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { dateInfo } from '../datecn.js';

const props = defineProps({
  note: { type: Object, required: true },
  side: { type: String, default: 'left' } // 桌面端交替：'left' | 'right'
});
const emit = defineEmits(['open', 'preview', 'leave']);

const root = ref(null);
const visible = ref(false);
const time = dateInfo(new Date(props.note.created_at)).time;

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !root.value) {
    visible.value = true;
    return;
  }
  const { stop } = useIntersectionObserver(
    root,
    ([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true;
        stop();
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
  );
});

function open() {
  emit('open', props.note.id);
}
function onEnter(e) {
  emit('preview', props.note, e.currentTarget);
}
</script>

<template>
  <article ref="root" class="tl-item" :class="[side, { visible }]">
    <span
      class="tl-marker"
      role="button"
      tabindex="0"
      :aria-label="`${time} 的笔记，点击查看`"
      @click="open"
      @keydown.enter.prevent="open"
      @mouseenter="onEnter"
      @focus="onEnter"
      @mouseleave="emit('leave')"
      @blur="emit('leave')"
    ></span>
    <div class="tl-meta"><slot name="meta">{{ time }}</slot></div>
    <div class="tl-body"><slot></slot></div>
  </article>
</template>
