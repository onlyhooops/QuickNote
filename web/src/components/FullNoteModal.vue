<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { dateInfo } from '../datecn.js';
import { contentStats } from '../rich.js';
import MomentCard from './MomentCard.vue';
import TipTapEditor from './TipTapEditor.vue';
import TagPicker from './TagPicker.vue';

const props = defineProps({
  noteId: { type: Number, required: true }
});
const emit = defineEmits(['close']);

const toast = inject('toast', () => {});
const bump = inject('bump', () => {});

const note = ref(null);
const mode = ref('view'); // view | edit
const html = ref('');
const tags = ref([]);
const saving = ref(false);

const when = computed(() => (note.value ? dateInfo(new Date(note.value.created_at)) : null));
const stats = computed(() => contentStats(html.value));

async function load() {
  try {
    note.value = await api.getNote(props.noteId);
  } catch (e) {
    toast('读取失败：' + e.message);
    emit('close');
  }
}

function edit() {
  html.value = note.value.content || '';
  tags.value = [...note.value.tags];
  mode.value = 'edit';
}

async function save() {
  if (saving.value || stats.value.isEmpty) {
    if (stats.value.isEmpty) toast('内容为空，请写点什么或插入图片');
    return;
  }
  saving.value = true;
  try {
    note.value = await api.updateNote(props.noteId, html.value, stats.value.plain, tags.value);
    mode.value = 'view';
    bump();
    toast('已更新');
  } catch (e) {
    toast('保存失败：' + e.message);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!window.confirm('删除这条记录？删除后无法恢复。')) return;
  try {
    await api.deleteNote(props.noteId);
    bump();
    toast('已删除');
    emit('close');
  } catch (e) {
    toast('删除失败：' + e.message);
  }
}

onMounted(load);
</script>

<template>
  <div class="full-note">
    <div class="full-note-bar">
      <button class="icon-btn" title="返回" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span v-if="note" class="ttl">{{ mode === 'view' ? '时间点' : '编辑记录' }}</span>
      <span class="sp"></span>
      <template v-if="mode === 'view'">
        <button class="btn danger-soft" @click="remove">删除</button>
        <button class="btn primary" @click="edit">编辑 ✎</button>
      </template>
      <template v-else>
        <button class="btn ghost" @click="mode = 'view'">取消</button>
        <button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </template>
    </div>

    <div v-if="!note" class="tl-empty">加载中…</div>

    <div v-else class="full-note-scroll">
      <!-- 查看模式：优雅排版 -->
      <div v-if="mode === 'view'" class="view-page">
        <div class="when" v-if="when">
          <div class="big">{{ when.monthDay }} · {{ when.weekday }}</div>
          <div>
            {{ when.dateText }} {{ when.time }}
            <template v-if="when.festivals.length"> · {{ when.festivals.join(' · ') }}</template>
            <template v-if="when.lunar"> · 农历{{ when.lunar }}</template>
            <template v-if="note.updated_at !== note.created_at"> · 曾编辑</template>
          </div>
          <div v-if="note.tags.length" style="margin-top: 12px">
            <span v-for="t in note.tags" :key="t" class="chip" style="cursor: default">{{ t }}</span>
          </div>
        </div>
        <MomentCard :note="note" :show-foot="false" />
      </div>

      <!-- 编辑模式 -->
      <div v-else class="edit-page">
        <p style="color: var(--tx-3); font-size: 12.5px; margin: 2px 4px 10px">
          仅修改内容与标签；时间点仍留在原时刻（{{ when?.time }} · {{ when?.monthDay }}）。
        </p>
        <div class="composer">
          <TagPicker v-model="tags" />
          <div class="md-host-md">
            <TipTapEditor
              v-model="html"
              :min-height="300"
              placeholder="修改这条记录…"
              @save="save"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ttl {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
}
</style>
