<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { dateInfo } from '../datecn.js';
import { sanitizeHtml } from '../rich.js';
import TimelineItem from '../components/TimelineItem.vue';

const router = useRouter();
const openNote = inject('openNote', (id) => router.push(`/note/${id}`));
const tl = inject('tl', { tick: ref(0), tag: ref(''), setTag: () => {} });

const notes = ref([]);
const loading = ref(false);
const q = ref('');
const allTags = ref([]);
const preview = ref(null); // { note, x, y }

const activeTag = computed(() => tl.tag.value);
const selectedTag = (name) => tl.setTag(name);

async function load() {
  loading.value = true;
  try {
    notes.value = await api.listNotes({
      q: q.value,
      tag: activeTag.value,
      sort: 'created',
      order: 'desc'
    });
  } catch (e) {
    console.error(e);
    notes.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadTags() {
  try {
    allTags.value = await api.listTags();
  } catch {
    allTags.value = [];
  }
}

let qTimer = null;
watch(q, () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(load, 280);
});
watch(() => tl.tag.value, load);
watch(() => tl.tick.value, load);

// 按日分组，并记录每组的全局起始索引（用于左右交替）
const groups = computed(() => {
  const out = [];
  let acc = 0;
  for (const n of notes.value) {
    const d = dateInfo(new Date(n.created_at));
    const last = out[out.length - 1];
    if (last && last.key === d.key) {
      last.items.push(n);
    } else {
      out.push({ key: d.key, ...d, start: acc, items: [n] });
    }
    acc++;
  }
  return out;
});

// 桌面左右交替：偶数 left、奇数 right
const sideOf = (g, i) => ((g.start + i) % 2 === 0 ? 'left' : 'right');

function headOf(dateKey) {
  return dateInfo(new Date(`${dateKey}T12:00:00`));
}
function fmtDateHead(g) {
  const info = headOf(g.key);
  const extra = [
    info.weekday,
    info.festivals.length ? info.festivals.join(' · ') : '',
    info.lunar ? `农历${info.lunar}` : ''
  ].filter(Boolean).join(' · ');
  return { main: info.monthDay, year: info.year, extra };
}

function showPreview(note, markerEl) {
  const dot = markerEl.getBoundingClientRect();
  const winW = window.innerWidth;
  const tipW = Math.min(400, winW * 0.86);
  let left = dot.left + dot.width / 2 - tipW / 2;
  left = Math.max(12, Math.min(left, winW - tipW - 12));
  let top = dot.top + 22;
  if (top + 330 > window.innerHeight && dot.top - 280 > 0) top = dot.top - 300;
  preview.value = { note, x: left, y: top, content: sanitizeHtml(note.content) };
}
function hidePreview() {
  preview.value = null;
}

onMounted(() => {
  load();
  loadTags();
});
onBeforeUnmount(() => clearTimeout(qTimer));
</script>

<template>
  <div class="timeline-wrap">
    <div class="page-head">
      <h1>时间轴</h1>
    </div>

    <div class="tl-toolbar">
      <div class="tl-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input v-model="q" type="text" placeholder="搜索记录…" />
      </div>
      <button v-if="activeTag" class="chip" @click="selectedTag('')">
        #{{ activeTag }} <span class="x">✕</span>
      </button>
    </div>

    <div v-if="allTags.length" class="tl-filter-chips">
      <button class="chip" :class="{ on: !activeTag }" @click="selectedTag('')">全部</button>
      <button
        v-for="t in allTags"
        :key="t.name"
        class="chip"
        :class="{ on: activeTag === t.name }"
        @click="selectedTag(t.name)"
      >{{ t.name }} {{ t.count }}</button>
    </div>

    <p v-if="loading" class="tl-empty">正在回溯…</p>

    <div v-else-if="!notes.length" class="tl-empty">
      <p style="font-size: 26px; margin-bottom: 8px">·</p>
      <p>{{ activeTag ? `没有「${activeTag}」标签的记录` : '时间轴还是空的' }}</p>
      <p style="font-size: 13px">去「录入」页写下第一条，它将化作时间线上的光点。</p>
      <button class="btn primary" style="margin-top: 14px" @click="router.push('/write')">去录入</button>
    </div>

    <template v-else>
      <p class="tl-stats">{{ notes.length }} 个时间点 · 悬停光点预览，点击进入全屏</p>
      <div class="tl">
        <section v-for="g in groups" :key="g.key" class="tl-day">
          <header class="tl-day-head">
            <div class="d1">{{ fmtDateHead(g).main }}</div>
            <div class="d2">
              {{ fmtDateHead(g).extra }}
              <template v-if="fmtDateHead(g).year !== new Date().getFullYear()">· {{ fmtDateHead(g).year }}</template>
            </div>
          </header>

          <TimelineItem
            v-for="(n, i) in g.items"
            :key="n.id"
            :note="n"
            :side="sideOf(g, i)"
            @open="openNote"
            @preview="showPreview"
            @leave="hidePreview"
          >
            <span class="tl-snippet">{{ n.plain || '（空白记录）' }}</span>
            <span v-if="n.tags.length" class="tl-tagsmini">
              <span v-for="t in n.tags" :key="t" class="mini">{{ t }}</span>
            </span>
          </TimelineItem>
        </section>
      </div>

      <!-- 悬浮预览卡（仅桌面） -->
      <div v-if="preview" class="tl-tip" :style="{ left: preview.x + 'px', top: preview.y + 'px' }">
        <div class="t1">
          {{ dateInfo(new Date(preview.note.created_at)).dateText }} ·
          {{ dateInfo(new Date(preview.note.created_at)).weekday }} ·
          {{ dateInfo(new Date(preview.note.created_at)).time }}
        </div>
        <div class="moment-body" v-html="preview.content"></div>
        <span class="go">点击查看完整内容 →</span>
      </div>
    </template>
  </div>
</template>
