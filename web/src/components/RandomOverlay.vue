<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import { api } from '../api.js';
import { dateInfo } from '../datecn.js';
import MomentCard from './MomentCard.vue';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const router = useRouter();

const pool = ref([]);
const note = ref(null);
const loading = ref(true);
const fade = ref(false);

async function loadPool() {
  loading.value = true;
  try {
    pool.value = await api.listNotes({ sort: 'created', order: 'desc' });
    pick(true);
  } catch {
    pool.value = [];
  } finally {
    loading.value = false;
  }
}

// 打开时才加载（组件常驻挂载，避免预取过期数据）
watch(
  () => props.open,
  (open) => {
    if (open) loadPool();
  }
);

function pick(first = false) {
  if (!pool.value.length) {
    note.value = null;
    return;
  }
  let next;
  if (pool.value.length === 1) next = pool.value[0];
  else {
    do {
      next = pool.value[Math.floor(Math.random() * pool.value.length)];
    } while (first === false && next.id === note.value?.id);
  }
  fade.value = false;
  requestAnimationFrame(() => (fade.value = true));
  note.value = next;
}

function goWrite() {
  emit('close');
  router.push('/write');
}

function openDetail(id) {
  emit('openDetail', id);
}

const when = computed(() => (note.value ? dateInfo(new Date(note.value.created_at)) : null));

</script>

<template>
  <div v-if="props.open" class="overlay">
    <div class="scrim" @click="emit('close')"></div>
    <div class="overlay-card random-card">
      <div class="overlay-head">
        <span class="ttl">随览</span>
        <span v-if="pool.length" class="sub">从 {{ pool.length }} 个时间点中拾取</span>
        <span class="sp"></span>
        <button class="icon-btn" title="关闭" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div class="overlay-body random-body">
        <div v-if="loading" class="tl-empty">拾取中…</div>

        <div v-else-if="!note" class="tl-empty">
          <Sparkles :size="40" :stroke-width="1.5" style="color: var(--tx-3)" />
          <p>还没有时间点可供随览</p>
          <button class="btn primary" @click="goWrite">写下第一条</button>
        </div>

        <div v-else class="random-item" :class="{ show: fade }">
          <div v-if="when" class="when-line">
            {{ when.monthDay }} {{ when.weekday }}
            <span v-if="when.festivals.length">· {{ when.festivals.join(' · ') }}</span>
            · {{ when.time }}
          </div>
          <MomentCard :note="note" :show-foot="false" />
          <div class="random-actions">
            <button class="btn ghost" @click="openDetail(note.id)">查看 · 编辑</button>
            <button class="btn primary" @click="pick()">再拾一条 ↻</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ttl {
  font-weight: 600;
  letter-spacing: 1px;
}
.sub {
  font-size: 12px;
  color: var(--tx-3);
}
.random-card {
  width: min(620px, 100%);
}
.random-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.random-item {
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.35s var(--ease), transform 0.35s var(--ease);
}
.random-item.show {
  opacity: 1;
  transform: none;
}
.when-line {
  font-size: 12.5px;
  color: var(--tx-3);
  margin-bottom: 18px;
  font-variant-numeric: tabular-nums;
}
.random-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 26px;
}
</style>
