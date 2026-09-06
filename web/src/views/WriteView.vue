<script setup>
import { api } from '../api.js';
import { dateInfo } from '../datecn.js';
import { contentStats } from '../rich.js';
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TipTapEditor from '../components/TipTapEditor.vue';
import TagPicker from '../components/TagPicker.vue';

const toast = inject('toast', (m) => console.log(m));

const DRAFT_KEY = 'quicknote.draft';
const NOTIFY_KEY = 'quicknote.draft.notified'; // sessionStorage：同会话内同一草稿只提醒一次
const now = ref(new Date());
const content = ref('');
const tags = ref([]);
const saving = ref(false);

let clock = null;
let draftTimer = null;
// 恢复草稿赋值时置位，用于吞掉紧随其后的 watch 触发（避免把“恢复”当成“新编辑”）
let skipNextWatch = false;

/** 草稿是否有“可恢复”的内容：有文字/图片/嵌入，或选过标签 */
function draftMeaningful(d) {
  if (!d) return false;
  const s = contentStats(d.content || '');
  return !s.isEmpty || (Array.isArray(d.tags) && d.tags.length > 0);
}

/** 当前输入是否“值得留存”：内容非空，或带标签 */
function currentMeaningful() {
  const s = contentStats(content.value);
  return !s.isEmpty || tags.value.length > 0;
}

function restoreDraft() {
  let d = null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) d = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (!d || !draftMeaningful(d)) {
    // 空草稿（例如编辑器残留的空 <p>）不恢复、不提醒
    clearDraft();
    return;
  }
  skipNextWatch = true;
  content.value = d.content || '';
  tags.value = Array.isArray(d.tags) ? d.tags : [];
  // 同一会话内，同一份草稿只在首次出现时提醒一次，避免反复弹「已恢复」
  try {
    const notified = sessionStorage.getItem(NOTIFY_KEY);
    if (d.ts && String(d.ts) !== notified) {
      toast('已恢复上一次未保存的内容');
      sessionStorage.setItem(NOTIFY_KEY, String(d.ts));
    }
  } catch {
    toast('已恢复上一次未保存的内容');
  }
}

function persistDraft() {
  if (!currentMeaningful()) return; // 没写过内容就不落草稿
  const payload = { content: content.value, tags: tags.value, ts: Date.now() };
  try {
    // 与已存草稿一致时不重写 ts——避免“同一份草稿”每次离开都被当成新的，反复弹恢复提醒
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const old = JSON.parse(raw);
        if (
          old &&
          old.content === payload.content &&
          JSON.stringify(old.tags || []) === JSON.stringify(payload.tags)
        ) {
          return;
        }
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** 有意义的输入才留存；被清空则连旧草稿一起清掉（视为放弃） */
function syncDraft() {
  if (currentMeaningful()) persistDraft();
  else clearDraft();
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(NOTIFY_KEY);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  clock = setInterval(() => (now.value = new Date()), 1000);
  restoreDraft();
  window.addEventListener('beforeunload', syncDraft);
});
onBeforeUnmount(() => {
  clearInterval(clock);
  clearTimeout(draftTimer);
  window.removeEventListener('beforeunload', syncDraft);
  syncDraft();
});

// 只有用户真正编辑（非恢复赋值）且内容有意义时才自动保存草稿
watch(
  [content, tags],
  () => {
    if (skipNextWatch) {
      skipNextWatch = false;
      return;
    }
    clearTimeout(draftTimer);
    draftTimer = setTimeout(syncDraft, 350);
  },
  { deep: true }
);

const info = computed(() => dateInfo(now.value));
const stats = computed(() => contentStats(content.value));
const wordLabel = computed(() => {
  const p = [];
  if (stats.value.text.length) p.push(`${stats.value.text.length} 字`);
  if (stats.value.imgs) p.push(`${stats.value.imgs} 张图`);
  if (stats.value.embeds) p.push(`${stats.value.embeds} 个嵌入`);
  return p.join(' · ') || '空';
});
const hasContent = computed(() => !stats.value.isEmpty);

const PRESETS = ['灵感', '备忘', '摘抄', '随笔'];
function togglePreset(name) {
  const i = tags.value.indexOf(name);
  if (i >= 0) tags.value.splice(i, 1);
  else tags.value.push(name);
}

async function save() {
  if (saving.value) return;
  if (!hasContent.value) {
    toast('先写下点什么，或插入一张图片 ✍️');
    return;
  }
  saving.value = true;
  try {
    const s = contentStats(content.value);
    await api.createNote(content.value, s.plain, tags.value);
    skipNextWatch = true;
    content.value = '';
    tags.value = [];
    clearDraft();
    toast('已化作时间点 · 见时间轴');
  } catch (e) {
    toast('保存失败：' + e.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="write-wrap">
    <div class="now-line">
      <span class="t">{{ info.time }}</span>
      <span class="meta">
        {{ info.dateText }} {{ info.weekday }}
        <template v-if="info.festivals.length">
          · <span class="hl">{{ info.festivals.join(' · ') }}</span>
        </template>
        <template v-if="info.lunar"> · 农历{{ info.lunar }}</template>
      </span>
    </div>

    <div class="write-tags">
      <!-- 预设胶囊在左，随后是已选标签与「+标签」输入，保证 +标签 恒在末尾 -->
      <div v-if="tags.length < 4" class="tag-presets">
        <button
          v-for="p in PRESETS"
          :key="p"
          class="chip"
          :class="{ on: tags.includes(p) }"
          @click="togglePreset(p)"
          type="button"
        >{{ p }}</button>
      </div>
      <TagPicker v-model="tags" />
    </div>

    <div class="md-host">
      <TipTapEditor
        v-model="content"
        placeholder="记录此刻，静待回响…"
        @save="save"
      />
    </div>

    <div class="write-bar">
      <span class="wordcount">{{ wordLabel }} · ⌘/Ctrl+Enter 保存</span>
      <button class="btn primary save-btn" :disabled="saving" @click="save" type="button">
        {{ saving ? '记录中…' : '保存' }}
      </button>
    </div>
  </div>
</template>
