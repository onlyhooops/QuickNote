<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:modelValue']);

const text = ref('');
const listId = 'tag-suggest-' + Math.random().toString(36).slice(2, 8);
// 服务端已存在的标签词表（“曾用过的标签”），来自 GET /api/tags
const all = ref([]);
// 本组件实例新增、且尚未被任何笔记引用的标签（删除胶囊时同步清库的依据）
const newOnes = new Set();
const open = ref(false); // 输入框聚焦时展开“曾用标签”点选
let closeTimer = null;

async function refresh() {
  try {
    all.value = (await api.listTags()).map((t) => t.name);
  } catch {
    /* ignore */
  }
}

function isExisting(name) {
  return all.value.includes(name);
}

/** 可点选的“曾用标签”：已存在于服务端、且当前未选 */
const available = computed(() => {
  const kw = text.value.trim();
  const list = all.value.filter((n) => !props.modelValue.includes(n));
  if (!kw) return list.slice(0, 14);
  const hit = list.filter((n) => n.includes(kw));
  // 关键词命中的排前，其余（供继续浏览）跟随，最多 14 个
  return [...hit, ...list.filter((n) => !hit.includes(n))].slice(0, 14);
});

function add(raw) {
  const t = String(raw ?? '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!t) return;
  const list = [...props.modelValue];
  if (!list.includes(t)) {
    list.push(t);
    emit('update:modelValue', list);
    // 全新标签 → 立即默认保存到服务端（未保存笔记也不丢失，下次可直接点选）
    if (!isExisting(t)) {
      api
        .ensureTag(t)
        .then((r) => {
          if (r && r.created) newOnes.add(t);
          refresh();
        })
        .catch(() => {});
    }
  }
  text.value = '';
}

function remove(name) {
  emit(
    'update:modelValue',
    props.modelValue.filter((t) => t !== name)
  );
  // 本次新建且未被任何笔记使用的标签：删除胶囊即从词库同步清掉
  if (newOnes.has(name)) {
    newOnes.delete(name);
    api.removeOrphanTag(name).catch(() => {}).finally(refresh);
  }
}

function onInput(e) {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
    e.preventDefault();
    add(text.value);
    open.value = false;
  } else if (e.key === 'Backspace' && !text.value && props.modelValue.length) {
    remove(props.modelValue[props.modelValue.length - 1]);
  } else if (e.key === 'Escape') {
    open.value = false;
  }
}

function onFocus() {
  refresh();
  clearTimeout(closeTimer);
  open.value = true;
}
function onBlur() {
  // 等 120ms：若焦点只是切到弹层内的选项（mousedown.prevent 已阻止失焦），不关闭
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    open.value = false;
    if (text.value.trim()) add(text.value); // 兼容旧行为：失焦时把已键入内容作为标签加入
  }, 120);
}

onMounted(refresh);
onBeforeUnmount(() => clearTimeout(closeTimer));
</script>

<template>
  <div class="tag-pick">
    <div class="tag-edit" @keydown="onInput">
      <span
        v-for="t in modelValue"
        :key="t"
        class="chip"
        style="cursor: default"
        :title="t"
      >
        {{ t }}
        <span class="x" role="button" aria-label="移除标签 {{ t }}" @click="remove(t)">✕</span>
      </span>
      <input
        v-model="text"
        :list="listId"
        placeholder="＋ 标签（回车添加）"
        @focus="onFocus"
        @blur="onBlur"
      />
      <datalist :id="listId">
        <option v-for="s in all" :key="s" :value="s" />
      </datalist>
    </div>

    <!-- 曾用标签点选：输入框聚焦时弹出，点一下即可复用，无需重复手打 -->
    <div v-if="open && available.length" class="tag-pop">
      <div class="tag-pop-title">
        曾用标签<span v-if="text.trim()">（含“{{ text.trim() }}”匹配）</span>
        <span class="sp"></span>
        <button class="tag-pop-close" type="button" title="收起" @mousedown.prevent @click="open = false">✕</button>
      </div>
      <div class="tag-pop-list">
        <button
          v-for="t in available"
          :key="t"
          type="button"
          class="tag-pop-item"
          @mousedown.prevent
          @click="add(t)"
        >{{ t }}</button>
      </div>
    </div>
  </div>
</template>
