<script setup>
import { api } from '../api.js';
import { dateInfo } from '../datecn.js';
import { contentStats } from '../rich.js';
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TipTapEditor from '../components/TipTapEditor.vue';
import TagPicker from '../components/TagPicker.vue';

const toast = inject('toast', (m) => console.log(m));

const DRAFT_KEY = 'quicknote.draft';
const now = ref(new Date());
const content = ref('');
const tags = ref([]);
const saving = ref(false);

let clock = null;
let draftTimer = null;

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && d.content) {
      content.value = d.content;
      tags.value = Array.isArray(d.tags) ? d.tags : [];
      toast('已恢复上一次未保存的内容');
    }
  } catch {
    /* ignore */
  }
}

function persistDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: content.value, tags: tags.value, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  clock = setInterval(() => (now.value = new Date()), 1000);
  restoreDraft();
  window.addEventListener('beforeunload', persistDraft);
});
onBeforeUnmount(() => {
  clearInterval(clock);
  clearTimeout(draftTimer);
  window.removeEventListener('beforeunload', persistDraft);
  persistDraft();
});

// 输入即自动保存草稿（防误触跳转丢失）
watch([content, tags], () => {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(persistDraft, 350);
}, { deep: true });

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
