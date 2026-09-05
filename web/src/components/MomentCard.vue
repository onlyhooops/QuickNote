<script setup>
import { computed } from 'vue';
import { sanitizeHtml, contentStats } from '../rich.js';
import { dateInfo } from '../datecn.js';

const props = defineProps({
  note: { type: Object, required: true },
  // hero:大字短文本  mid:中等  默认正文
  showFoot: { type: Boolean, default: true },
  compact: { type: Boolean, default: false }
});

const safeHtml = computed(() => sanitizeHtml(props.note.content || ''));

const stats = computed(() => {
  try {
    return contentStats(props.note.content || '');
  } catch {
    return { text: '', imgs: 0 };
  }
});

const variantClass = computed(() => {
  if (props.compact) return '';
  const t = stats.value.text.length;
  const imgs = stats.value.imgs;
  if (imgs === 0 && t > 0 && t <= 70) return 'text-hero';
  if (imgs === 0 && t > 0 && t <= 200) return 'text-mid';
  return '';
});

const when = computed(() => {
  const d = new Date(props.note.created_at);
  const info = dateInfo(d);
  return info;
});
</script>

<template>
  <div class="moment-card" :class="variantClass">
    <div class="moment-body" v-html="safeHtml"></div>

    <div v-if="showFoot && !compact" class="moment-foot">
      <span>{{ when.monthDay }}</span>
      <span class="dotsep">{{ when.weekday }}</span>
      <span class="dotsep">{{ when.time }}</span>
      <span v-if="when.festivals.length" class="dotsep hl">{{ when.festivals.join(' · ') }}</span>
      <span v-if="when.lunar" class="dotsep">农历{{ when.lunar }}</span>
      <span
        v-for="t in note.tags"
        :key="t"
        class="chip"
        style="cursor: default; padding: 1px 10px; margin-left: 2px"
      >{{ t }}</span>
    </div>
  </div>
</template>

<style scoped>
.hl {
  color: var(--acc-ink);
}
</style>
