<script setup>
import { ref, watch } from 'vue';
import { Sparkles, RotateCcw, X } from 'lucide-vue-next';
import { api } from '../api.js';

const props = defineProps({
  open: { type: Boolean, default: false },
  text: { type: String, default: '' } // 纯文本（已剔除图片/卡片/iframe）
});
const emit = defineEmits(['close', 'insert']);

const loading = ref(false);
const error = ref('');
const content = ref('');
const original = ref('');

async function explore() {
  loading.value = true;
  error.value = '';
  content.value = '';
  try {
    const r = await api.aiExplore(props.text);
    content.value = r.content || '';
    if (!content.value.trim()) error.value = 'AI 未返回内容';
  } catch (e) {
    error.value = e.message || '请求失败';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    original.value = props.text || '';
    explore();
  }
);

function confirmInsert() {
  if (!content.value.trim()) return;
  emit('insert', content.value);
  emit('close');
}
</script>

<template>
  <div v-if="props.open" class="overlay" style="z-index: 220">
    <div class="scrim" @click="emit('close')"></div>
    <div class="overlay-card" style="width: min(680px, 100%)">
      <div class="overlay-head">
        <Sparkles :size="16" :stroke-width="1.8" style="color: var(--acc)" />
        <span class="ttl">AI 探索 · 溯源与扩展</span>
        <span class="sp"></span>
        <button class="icon-btn" title="关闭" @click="emit('close')">
          <X :size="18" :stroke-width="1.8" />
        </button>
      </div>

      <div class="overlay-body" style="display: flex; flex-direction: column; gap: 12px">
        <div class="ai-original" v-if="original">
          <div class="lbl">原文（纯文字部分）</div>
          <p>{{ original.length > 600 ? original.slice(0, 600) + ' …' : original }}</p>
        </div>

        <div v-if="loading" class="ai-hint">
          <Sparkles :size="18" class="spin" /> 正在分析…
        </div>
        <p v-else-if="error" class="ai-hint" style="color: var(--danger)">{{ error }}</p>

        <template v-else-if="content">
          <div class="lbl">AI 建议（可修改后再插入）</div>
          <textarea v-model="content" class="ai-edit" spellcheck="false"></textarea>
        </template>
      </div>

      <div class="overlay-foot">
        <button class="btn ghost" @click="explore" :disabled="loading">
          <RotateCcw :size="14" :stroke-width="1.8" /> 重新生成
        </button>
        <span class="sp"></span>
        <button class="btn ghost" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="loading || !content.trim()" @click="confirmInsert">
          插入记录
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ttl {
  font-weight: 600;
  letter-spacing: 0.5px;
}
.lbl {
  font-size: 11.5px;
  color: var(--tx-3);
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.ai-original {
  background: var(--panel-2);
  border-radius: 10px;
  padding: 10px 14px;
}
.ai-original p {
  margin: 0;
  color: var(--tx-2);
  font-size: 13px;
  line-height: 1.7;
  max-height: 120px;
  overflow: hidden;
}
.ai-edit {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--tx);
}
.ai-edit:focus {
  border-color: var(--acc);
}
.ai-hint {
  color: var(--tx-2);
  display: flex;
  align-items: center;
  gap: 8px;
}
.spin {
  animation: aiSpin 1s linear infinite;
}
@keyframes aiSpin {
  to {
    transform: rotate(360deg);
  }
}
.overlay-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px 16px;
  flex-shrink: 0;
}
.overlay-foot .sp {
  flex: 1;
}
</style>
