<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, ImagePlus, Paperclip, Undo2, Redo2, Sparkles
} from 'lucide-vue-next';
import { api } from '../api.js';
import { Embed, embedInfo } from '../embed.js';
import { mediaFreePlain } from '../rich.js';
import { buildAiBlockHtml } from '../ai.js';
import AiExplore from './AiExplore.vue';

// 扩展 Link：允许 download 属性，以便附件下载保留原始（含中文）文件名
const DownloadLink = Link.extend({
  addAttributes() {
    return { ...this.parent(), download: { default: null } };
  }
});

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '记录此刻，静待回响…' },
  minHeight: { type: Number, default: 260 }
});
const emit = defineEmits(['update:modelValue', 'save']);

const imgInput = ref(null);
const attInput = ref(null);

// ---- AI 探索（可开关，需在设置中启用并配置 DeepSeek Key）----
const aiReady = ref(false);
const aiEnabled = ref(false);
const aiOpen = ref(false);
const aiText = computed(() => mediaFreePlain(props.modelValue));
let suppress = false;
let ready = false;
let pending = null;

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    DownloadLink.configure({ openOnClick: false, autolink: true }),
    Image.configure({ allowBase64: false }),
    Placeholder.configure({ placeholder: props.placeholder }),
    Embed
  ],
  editorProps: {
    attributes: { class: 'ProseMirror qn-body' },
    handleKeyDown: (_view, event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        emit('save');
        return true;
      }
      return false;
    },
    handlePaste: (_view, event) => paste(event),
    handleDrop: (_view, event) => drop(event)
  },
  onUpdate: ({ editor: e }) => {
    suppress = true;
    emit('update:modelValue', e.getHTML());
  }
});

watch(editor, (ed) => {
  if (ed) {
    ready = true;
    if (pending != null) {
      ed.commands.setContent(pending || '');
      pending = null;
    }
  }
});

watch(
  () => props.modelValue,
  (value) => {
    if (!ready) {
      pending = value;
      return;
    }
    const ed = editor.value;
    if (suppress) {
      suppress = false;
      return;
    }
    if (value !== ed.getHTML()) ed.commands.setContent(value || '');
  }
);

// ---------- 图片上传 ----------
async function upload(f) {
  return api.uploadImage(f);
}
function insertImages(files) {
  const ed = editor.value;
  if (!ed) return;
  (async () => {
    for (const f of files) {
      const url = await upload(f);
      ed.chain().focus().setImage({ src: url }).run();
    }
    emit('update:modelValue', ed.getHTML());
  })();
}
function insertAttachment(f) {
  const ed = editor.value;
  if (!ed) return;
  (async () => {
    const up = await api.uploadAttachment(f);
    // 用浏览器原始文件名作显示与下载名，杜绝中文乱码（服务端也已还原，双保险）
    const name = (f.name || up.name || '附件').replace(/"/g, '');
    ed
      .chain()
      .focus()
      .insertContent(`<a href="${up.url}" download="${name}">${name}</a> `)
      .run();
    emit('update:modelValue', ed.getHTML());
  })();
}

// ---------- 文件选择（图片 / 附件）----------
function onImagePick(e) {
  const input = e.target;
  const files = [...(input.files || [])];
  input.value = '';
  if (files.length) insertImages(files);
}
function onAttPick(e) {
  const input = e.target;
  const f = input.files && input.files[0];
  input.value = '';
  if (f) insertAttachment(f);
}

// ---------- 粘贴 / 拖拽 ----------
function imageFilesFrom(e) {
  const dt = e.dataTransfer || e.clipboardData;
  return [...(dt.files || [])].filter((x) => x.type && x.type.startsWith('image/'));
}
function urlTextFrom(e) {
  const dt = e.dataTransfer || e.clipboardData;
  const txt = dt.getData('text/uri-list') || dt.getData('text/plain') || '';
  return txt.split(/[\n\r]+/).map((s) => s.trim()).find((s) => /^https?:\/\//i.test(s)) || '';
}

function insertEmbed(url, info) {
  const ed = editor.value;
  if (!ed) return;
  ed.chain().focus().insertContent({ type: 'embed', attrs: { href: url, provider: info?.provider || '', iframe: info?.iframe || '', h: info?.h || 0 } }).run();
  emit('update:modelValue', ed.getHTML());
  if (!info) unfurlInto(url, ed);
}
function unfurlInto(url, ed) {
  (async () => {
    try {
      const meta = await api.unfurl(url);
      // 找到文档中最后一个待填充的 card 简单处理：追加 title/desc
      // 用事务更新最近插入的 embed 节点属性
      let node = null;
      ed.state.doc.descendants((n, pos) => {
        if (n.type.name === 'embed' && n.attrs.href === url && !n.attrs.title) node = { n, pos };
      });
      if (node) {
        ed.chain().command(({ tr }) => {
          // 直接在节点插入后重建，简单起见用 setNodeMarkup 更新属性
          tr.setNodeMarkup(node.pos, undefined, { ...node.n.attrs, title: meta.title, desc: meta.desc, thumb: meta.thumb, provider: '', iframe: '' });
          return true;
        }).run();
        emit('update:modelValue', ed.getHTML());
      }
    } catch {
      /* ignore */
    }
  })();
}

function paste(event) {
  const imgs = imageFilesFrom(event);
  if (imgs.length) {
    event.preventDefault();
    insertImages(imgs);
    return true;
  }
  const url = urlTextFrom(event);
  if (url) {
    const info = embedInfo(url);
    if (info || true) {
      event.preventDefault();
      insertEmbed(url, info);
      return true;
    }
  }
  return false;
}
function drop(event) {
  const imgs = imageFilesFrom(event);
  if (imgs.length) {
    event.preventDefault();
    insertImages(imgs);
    return true;
  }
  const url = urlTextFrom(event);
  if (url) {
    event.preventDefault();
    const info = embedInfo(url);
    insertEmbed(url, info);
    return true;
  }
  return false;
}

// ---------- 工具栏 ----------
const is = (name, attrs) => !!editor.value?.isActive(name, attrs);
const run = (fn) => () => fn(editor.value?.chain().focus());

const buttons = [
  { title: 'H2', icon: Heading2, run: run((c) => c.toggleHeading({ level: 2 }).run()), active: () => is('heading', { level: 2 }) },
  { title: 'H3', icon: Heading3, run: run((c) => c.toggleHeading({ level: 3 }).run()), active: () => is('heading', { level: 3 }) },
  { sep: true },
  { title: '加粗', icon: Bold, run: run((c) => c.toggleBold().run()), active: () => is('bold') },
  { title: '斜体', icon: Italic, run: run((c) => c.toggleItalic().run()), active: () => is('italic') },
  { title: '删除线', icon: Strikethrough, run: run((c) => c.toggleStrike().run()), active: () => is('strike') },
  { sep: true },
  { title: '无序列表', icon: List, run: run((c) => c.toggleBulletList().run()), active: () => is('bulletList') },
  { title: '有序列表', icon: ListOrdered, run: run((c) => c.toggleOrderedList().run()), active: () => is('orderedList') },
  { title: '引用', icon: Quote, run: run((c) => c.toggleBlockquote().run()), active: () => is('blockquote') },
  { title: '链接', icon: Link2, run: () => toggleLink(), active: () => is('link') },
  { sep: true },
  { title: '图片', icon: ImagePlus, run: () => imgInput.value?.click(), active: () => false },
  { title: '附件（任意文件）', icon: Paperclip, run: () => attInput.value?.click(), active: () => false },
  { sep: true },
  { title: '撤销', icon: Undo2, run: run((c) => c.undo().run()), active: () => false },
  { title: '重做', icon: Redo2, run: run((c) => c.redo().run()), active: () => false }
];

function toggleLink() {
  const ed = editor.value;
  if (!ed) return;
  if (ed.isActive('link')) {
    ed.chain().focus().unsetLink().run();
    return;
  }
  const url = window.prompt('链接地址', 'https://');
  if (!url) return;
  ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

onMounted(() => {
  api
    .getAiConfig()
    .then((c) => (aiEnabled.value = !!c.enabled))
    .catch(() => (aiEnabled.value = false))
    .finally(() => (aiReady.value = true));
});

// 在文档末尾追加一个 HTML 块（AI 补全等）
function appendBlock(html) {
  const ed = editor.value;
  if (!ed || !html) return;
  const end = ed.state.doc.content.size;
  ed.chain().focus(end).insertContent(html).run();
  emit('update:modelValue', ed.getHTML());
}
function onAiInsert(text) {
  appendBlock(buildAiBlockHtml(text));
}
defineExpose({ appendBlock });

onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div class="tt-editor" :style="{ minHeight: minHeight + 'px' }">
    <div class="tt-toolbar">
      <template v-for="(b, i) in buttons" :key="i">
        <span v-if="b.sep" class="tt-sep"></span>
        <button
          v-else
          class="tt-btn"
          :class="{ on: b.active() }"
          :title="b.title"
          type="button"
          @mousedown.prevent
          @click.prevent="b.run()"
        >
          <component :is="b.icon" :size="17" :stroke-width="1.8" />
        </button>
      </template>

      <!-- AI 探索（需在设置中启用并配置 DeepSeek Key） -->
      <span v-if="aiReady && aiEnabled" class="tt-sep"></span>
      <button
        v-if="aiReady && aiEnabled"
        class="tt-btn ai-btn"
        :class="{ off: !aiText }"
        :title="aiText ? 'AI 探索 · 出处研判与内容补全' : 'AI 探索（需先有文字内容）'"
        type="button"
        @mousedown.prevent
        @click.prevent="aiText && (aiOpen = true)"
      >
        <Sparkles :size="17" :stroke-width="1.8" />
      </button>
    </div>
    <EditorContent :editor="editor" class="tt-content" />
    <input ref="imgInput" type="file" accept="image/*" multiple hidden @change="onImagePick" />
    <input ref="attInput" type="file" hidden @change="onAttPick" />
    <AiExplore :open="aiOpen" :text="aiText" @close="aiOpen = false" @insert="onAiInsert" />
  </div>
</template>
