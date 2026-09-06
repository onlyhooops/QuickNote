<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../api.js';
import { dateInfo } from '../datecn.js';
import MomentCard from './MomentCard.vue';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close', 'openDetail']);

const now = new Date();
const nowInfo = dateInfo(now);

const notes = ref([]);
const loading = ref(true);
const messages = [
  '此刻没有回响，时间在这里留白。',
  '这一天的这一刻，安静得没有回声。',
  '没有一个年份在这个时刻留下记录。',
  '回响落空——正是此刻的独特之处。'
];
const msg = ref(messages[0]);

const todayHour = now.getHours();
const near = (iso) => Math.abs(new Date(iso).getHours() - todayHour) <= 2;

// 仅保留“往年同月同日”（历史上的今天/此刻）的记录：同年同日（今天新写的）不进回响
const groups = computed(() => {
  const map = new Map();
  for (const n of notes.value) {
    const d = dateInfo(new Date(n.created_at));
    if (d.month !== nowInfo.month || d.day !== nowInfo.day) continue;
    if (d.year >= nowInfo.year) continue; // 今年/今天的记录不属于“历史”
    if (!map.has(d.year)) map.set(d.year, []);
    map.get(d.year).push(n);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
});

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    msg.value = messages[Math.floor(Math.random() * messages.length)];
    loading.value = true;
    try {
      notes.value = await api.listNotes({ sort: 'created', order: 'desc' });
    } catch {
      notes.value = [];
    } finally {
      loading.value = false;
    }
  }
);
</script>

<template>
  <div v-if="props.open" class="overlay">
    <div class="scrim" @click="emit('close')"></div>
    <div class="overlay-card">
      <div class="overlay-head">
        <span class="ttl">回响</span>
        <span class="sub">{{ nowInfo.monthDay }} {{ nowInfo.weekday }} · 历史上的今天</span>
        <span class="sp"></span>
        <button class="icon-btn" title="关闭" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div class="overlay-body" style="padding-bottom: 34px">
        <div class="echo-hero">
          <div class="big">{{ nowInfo.monthDay }} · {{ nowInfo.weekday }}</div>
          <div>往年 · 同月同日 {{ nowInfo.time }}</div>
        </div>

        <div v-if="loading" class="tl-empty">翻找历史中的此刻…</div>

        <div v-else-if="!groups.length" class="echo-none">
          <p class="echo-text">{{ msg }}</p>
          <button class="btn primary" @click="emit('close')">去记录今天</button>
        </div>

        <div v-else>
          <section v-for="g in groups" :key="g.year" class="echo-year">
            <div class="echo-year-head">
              <span class="y">{{ g.year }}年</span>
              <span class="dotsc">·</span>
              <span>{{ nowInfo.monthDay }}</span>
              <span class="cnt">{{ g.items.length }} 条</span>
            </div>
            <article
              v-for="n in g.items"
              :key="n.id"
              class="echo-item"
              @click="emit('openDetail', n.id)"
            >
              <span class="t">{{ dateInfo(new Date(n.created_at)).time }}</span>
              <MomentCard :note="n" :show-foot="false" />
              <span v-if="near(n.created_at)" class="chip echo-now">约今时</span>
            </article>
          </section>
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
.echo-hero {
  margin: 2px 2px 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-soft);
}
.echo-hero .big {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.echo-hero > div:last-child {
  font-size: 12.5px;
  color: var(--tx-3);
  margin-top: 2px;
}
.echo-none {
  text-align: center;
  padding: 36px 12px;
}
.echo-text {
  font-size: 16px;
  font-family: var(--serif);
  color: var(--tx);
  margin: 0 0 22px;
  line-height: 1.8;
}
.echo-year {
  margin-bottom: 6px;
}
.echo-year-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  color: var(--tx-2);
  margin: 16px 2px 8px;
}
.echo-year-head .y {
  font-weight: 700;
  font-size: 14px;
  color: var(--tx);
}
.echo-year-head .cnt {
  margin-left: auto;
  font-size: 11px;
  color: var(--tx-3);
}
.echo-item {
  position: relative;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
  padding: 14px 6px;
  border-bottom: 1px dashed var(--line-soft);
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s var(--ease);
}
.echo-item:hover {
  background: var(--panel-2);
}
.echo-item .t {
  font-family: var(--sans);
  font-size: 11.5px;
  color: var(--tx-3);
  padding-top: 4px;
  font-variant-numeric: tabular-nums;
}
.echo-now {
  position: absolute;
  right: 4px;
  top: 4px;
  background: var(--acc-soft);
  color: var(--acc);
  border-color: transparent;
  padding: 1px 8px;
  font-size: 11px;
}
</style>
