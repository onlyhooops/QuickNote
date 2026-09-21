<script setup>
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PenLine, Clock, Settings, Dices, History, Sun, Moon } from 'lucide-vue-next';
import RandomOverlay from './components/RandomOverlay.vue';
import LastYearOverlay from './components/LastYearOverlay.vue';
import FullNoteModal from './components/FullNoteModal.vue';
import { api } from './api.js';
import { effectiveTheme, getThemePref, setThemePref } from './theme.js';

const route = useRoute();
const router = useRouter();

const toastMsg = ref('');
const toastShow = ref(false);
let toastTimer = null;
function toast(msg) {
  toastMsg.value = msg;
  toastShow.value = false;
  requestAnimationFrame(() => (toastShow.value = true));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastShow.value = false), 2400);
}

const tick = ref(0);
const tlTag = ref('');
function bump() {
  tick.value++;
}
function setTimelineTag(name) {
  tlTag.value = name || '';
  if (route.path !== '/timeline') router.push('/timeline');
}

provide('toast', toast);
provide('openNote', openNote);
provide('bump', bump);
provide('tl', { tick, tag: tlTag, setTag: setTimelineTag });

const fullId = ref(null);
const randomOpen = ref(false);
const lastYearOpen = ref(false);
function openNote(id) {
  randomOpen.value = false;
  lastYearOpen.value = false;
  fullId.value = Number(id);
}
function openRandom() {
  randomOpen.value = true;
}
function openLastYear() {
  lastYearOpen.value = true;
}

const themePref = ref(getThemePref());
const themeEff = computed(() => effectiveTheme(themePref.value));
const themeLabel = computed(() =>
  themePref.value === 'auto' ? '跟随系统' : themePref.value === 'dark' ? '深色' : '浅色'
);
function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(themePref.value) + 1) % order.length];
  themePref.value = next;
  setThemePref(next);
}

const active = computed(() => {
  const p = route.path;
  if (p.startsWith('/write') || p === '/') return '/write';
  if (p.startsWith('/timeline')) return '/timeline';
  return '/settings';
});
function go(path) {
  router.push(path);
}

const tags = ref([]);
async function refreshTags() {
  try {
    tags.value = await api.listTags();
  } catch {
    tags.value = [];
  }
}
onMounted(refreshTags);
watch(() => route.fullPath, refreshTags);
</script>

<template>
  <div class="app">
    <aside class="side">
      <div class="side-brand">
        <span class="dot"></span>
        <span class="name">快记</span>
        <span class="tag">QuickNote</span>
      </div>

      <div class="nav-sec">记录</div>
      <button class="nav-item" :class="{ on: active === '/write' }" @click="go('/write')" data-nav="write">
        <span class="ico"><PenLine :size="18" :stroke-width="1.8" /></span>录入
      </button>
      <button class="nav-item" :class="{ on: active === '/timeline' }" @click="go('/timeline')" data-nav="timeline">
        <span class="ico"><Clock :size="18" :stroke-width="1.8" /></span>时间轴
      </button>

      <div class="nav-sec">回顾</div>
      <button class="nav-item" @click="openRandom" data-ov="random">
        <span class="ico"><Dices :size="18" :stroke-width="1.8" /></span>随览
      </button>
      <button class="nav-item" @click="openLastYear" data-ov="lastyear">
        <span class="ico"><History :size="18" :stroke-width="1.8" /></span>回响
      </button>

      <template v-if="tags.length">
        <div class="nav-sec">标签</div>
        <div class="side-tags">
          <button
            v-for="t in tags"
            :key="t.name"
            class="nav-item"
            :class="{ on: tlTag === t.name && active === '/timeline' }"
            @click="setTimelineTag(t.name)"
          >
            <span class="dotmini"></span>
            {{ t.name }}
            <span class="cnt">{{ t.count }}</span>
          </button>
        </div>
      </template>

      <div class="side-foot">
        <button class="nav-item" :class="{ on: active === '/settings' }" @click="go('/settings')" data-nav="settings">
          <span class="ico"><Settings :size="18" :stroke-width="1.8" /></span>设置
        </button>
        <div class="mode-row">
          <span>{{ themeLabel }}主题</span>
          <button class="icon-btn" data-theme-toggle :title="'主题：' + themeLabel + '（点击切换）'" @click="cycleTheme">
            <Moon v-if="themeEff === 'dark'" :size="16" :stroke-width="1.8" />
            <Sun v-else :size="16" :stroke-width="1.8" />
          </button>
        </div>
      </div>
    </aside>

    <header class="mobbar">
      <span class="brand"><span class="dot"></span>快记</span>
      <span class="sp"></span>
      <button class="icon-btn" data-ov="random" title="随览" @click="openRandom"><Dices :size="19" :stroke-width="1.8" /></button>
      <button class="icon-btn" data-ov="lastyear" title="回响" @click="openLastYear"><History :size="19" :stroke-width="1.8" /></button>
      <button class="icon-btn" data-theme-toggle :title="'主题：' + themeLabel" @click="cycleTheme">
        <Moon v-if="themeEff === 'dark'" :size="18" :stroke-width="1.8" />
        <Sun v-else :size="18" :stroke-width="1.8" />
      </button>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <nav class="tabbar">
      <button class="tb" :class="{ on: active === '/write' }" @click="go('/write')" data-nav="write">
        <PenLine :size="21" :stroke-width="2" />录入
      </button>
      <button class="tb" :class="{ on: active === '/timeline' }" @click="go('/timeline')" data-nav="timeline">
        <Clock :size="21" :stroke-width="2" />时间轴
      </button>
      <button class="tb" :class="{ on: active === '/settings' }" @click="go('/settings')" data-nav="settings">
        <Settings :size="21" :stroke-width="2" />设置
      </button>
    </nav>

    <RandomOverlay :open="randomOpen" @close="randomOpen = false" @open-detail="openNote" />
    <LastYearOverlay :open="lastYearOpen" @close="lastYearOpen = false" @open-detail="openNote" />
    <FullNoteModal v-if="fullId" :note-id="fullId" @close="fullId = null" />

    <div class="toast" :class="{ show: toastShow }">{{ toastMsg }}</div>
  </div>
</template>
