<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:modelValue']);

const text = ref('');
const suggest = ref([]);

async function loadSuggest() {
  try {
    suggest.value = (await api.listTags()).map((t) => t.name);
  } catch {
    suggest.value = [];
  }
}

function add(name) {
  const t = String(name ?? '').trim().slice(0, 20);
  if (!t) return;
  const list = [...props.modelValue];
  if (!list.includes(t)) {
    list.push(t);
    emit('update:modelValue', list);
  }
  text.value = '';
}

function remove(name) {
  emit(
    'update:modelValue',
    props.modelValue.filter((t) => t !== name)
  );
}

function onInput(e) {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
    e.preventDefault();
    add(text.value);
  } else if (e.key === 'Backspace' && !text.value && props.modelValue.length) {
    remove(props.modelValue[props.modelValue.length - 1]);
  }
}

onMounted(loadSuggest);
</script>

<template>
  <div class="tag-edit" @keydown="onInput">
    <span
      v-for="t in modelValue"
      :key="t"
      class="chip"
      style="cursor: default"
    >
      {{ t }}
      <span class="x" role="button" @click="remove(t)">✕</span>
    </span>
    <input
      v-model="text"
      list="tag-suggest"
      placeholder="＋ 标签（回车添加）"
      @blur="add(text)"
    />
    <datalist id="tag-suggest">
      <option v-for="s in suggest" :key="s" :value="s" />
    </datalist>
  </div>
</template>
