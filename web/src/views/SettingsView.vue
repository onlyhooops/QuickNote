<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { applyTheme, getThemePref, setThemePref } from '../theme.js';
import { SCHEMES, getScheme, setScheme } from '../font.js';

const pref = ref(getThemePref());
const THEMES = [
  { id: 'auto', label: '跟随系统' },
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' }
];
function chooseTheme(p) {
  pref.value = p;
  setThemePref(p);
}

const fontScheme = ref(getScheme());
function chooseScheme(id) {
  fontScheme.value = id;
  setScheme(id);
}

const form = reactive({
  enabled: false,
  url: '',
  username: '',
  password: '',
  remoteDir: '/QuickNote'
});
const autoBackup = reactive({ enabled: false, everyHours: 24 });
const saving = ref(false);
const running = ref(false);
const message = ref('');
const result = ref('');

// ---- AI 助手 ----
const ai = reactive({ enabled: false, model: 'deepseek-v4-flash', effort: 'high', hasKey: false });
const aiKey = ref('');
const aiSaving = ref(false);
const aiTesting = ref(false);
const aiMsg = ref('');
const aiErr = ref('');
async function loadAi() {
  try {
    const c = await api.getAiConfig();
    ai.enabled = !!c.enabled;
    ai.model = c.model || 'deepseek-v4-flash';
    ai.effort = c.effort || 'high';
    ai.hasKey = !!c.hasKey;
  } catch {
    /* ignore */
  }
}
async function saveAi() {
  aiSaving.value = true;
  aiErr.value = '';
  aiMsg.value = '';
  try {
    const r = await api.saveAiConfig({ enabled: ai.enabled, model: ai.model, effort: ai.effort, apiKey: aiKey.value });
    ai.hasKey = !!r?.hasKey || !!r?.apiKeySet || !!aiKey.value;
    aiKey.value = '';
    aiMsg.value = '已保存 ✓';
  } catch (e) {
    aiErr.value = '保存失败：' + e.message;
  } finally {
    aiSaving.value = false;
  }
}
async function testAi() {
  aiTesting.value = true;
  aiErr.value = '';
  aiMsg.value = '';
  try {
    await api.testAi();
    aiMsg.value = '连接正常 ✓';
  } catch (e) {
    aiErr.value = '连接失败：' + e.message;
  } finally {
    aiTesting.value = false;
  }
}

async function loadBackup() {
  try {
    const cfg = await api.getBackupConfig();
    Object.assign(form, {
      enabled: !!cfg.webdav?.enabled,
      url: cfg.webdav?.url || '',
      username: cfg.webdav?.username || '',
      remoteDir: cfg.webdav?.remoteDir || '/QuickNote'
    });
    Object.assign(autoBackup, {
      enabled: !!cfg.autoBackup?.enabled,
      everyHours: Number(cfg.autoBackup?.everyHours) || 24
    });
    if (cfg.autoBackup?.lastRunAt) {
      result.value = `上次备份：${new Date(cfg.autoBackup.lastRunAt).toLocaleString('zh-CN')}`;
    }
  } catch (e) {
    message.value = '读取配置失败：' + e.message;
  }
}

async function saveBackup() {
  saving.value = true;
  message.value = '';
  try {
    await api.saveBackupConfig({
      webdav: {
        enabled: form.enabled,
        url: form.url.trim(),
        username: form.username.trim(),
        password: form.password,
        remoteDir: form.remoteDir.trim() || '/QuickNote'
      },
      autoBackup: {
        enabled: autoBackup.enabled,
        everyHours: Math.max(1, Number(autoBackup.everyHours) || 24)
      }
    });
    message.value = '已保存 ✓';
  } catch (e) {
    message.value = '保存失败：' + e.message;
  } finally {
    saving.value = false;
  }
}

async function runNow() {
  running.value = true;
  message.value = '';
  result.value = '正在备份…';
  try {
    const r = await api.runBackup();
    result.value = r.message;
  } catch (e) {
    result.value = '备份失败：' + e.message;
  } finally {
    running.value = false;
  }
}

onMounted(() => {
  loadBackup();
  loadAi();
  window.addEventListener('themechange', () => (pref.value = getThemePref()));
});
</script>

<template>
  <div class="settings-wrap">
    <div class="page-head">
      <h1>设置</h1>
    </div>

    <div class="set-section">
      <h3 class="set-title">外观</h3>
      <div class="set-card">
        <p style="margin: 0 0 12px; font-size: 14px; color: var(--tx-2)">
          明暗主题 · 当前生效：{{ pref === 'auto' ? '跟随系统' : pref === 'dark' ? '深色' : '浅色' }}
        </p>
        <div class="seg">
          <button
            v-for="t in THEMES"
            :key="t.id"
            :class="{ on: pref === t.id }"
            @click="chooseTheme(t.id)"
          >{{ t.label }}</button>
        </div>
      </div>
    </div>

    <div class="set-section">
      <h3 class="set-title">字体</h3>
      <div class="set-card">
        <p style="margin: 0 0 14px; font-size: 13px; color: var(--tx-2)">
          3 套方案，中文 / 英文成对，点击即全局生效并可在下方预览。
        </p>
        <div class="font-schemes">
          <button
            v-for="s in SCHEMES"
            :key="s.id"
            class="scheme"
            :class="{ on: fontScheme === s.id }"
            @click="chooseScheme(s.id)"
          >
            <span class="s-name">{{ s.label }}</span>
            <span class="s-desc">{{ s.desc }}</span>
          </button>
        </div>

        <div class="font-preview">
          <p class="pv-cn">永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭。</p>
          <p class="pv-en">The quick brown fox · 快记 QuickNote · 01:27</p>
          <p class="pv-meta">第 12 个时间点 · 农历七月廿四 · 1234567890</p>
        </div>
      </div>
    </div>

    <div class="set-section">
      <h3 class="set-title">AI 助手</h3>
      <div class="set-card">
        <p style="margin: 0 0 8px; font-size: 13px; color: var(--tx-2)">
          可选功能：在记录编辑器点「✨ AI 探索」，对<strong>纯文字部分</strong>做出处研判与内容补全
          （不含图片/网页卡/音乐/视频卡片）。Key 仅存本机服务端，不会外传。
        </p>
        <label class="switch-row">
          <input v-model="ai.enabled" type="checkbox" />
          <span>启用 AI 助手</span>
        </label>
        <div class="field">
          <label>模型</label>
          <select v-model="ai.model" class="ai-select">
            <option value="deepseek-v4-flash">deepseek-v4-flash（默认 · 快）</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro（更强）</option>
          </select>
        </div>
        <div class="field">
          <label>思考 / 推理强度</label>
          <select v-model="ai.effort" class="ai-select">
            <option value="high">高（默认，更准确）</option>
            <option value="low">低（更快）</option>
            <option value="max">最大</option>
            <option value="off">关闭思考（最快）</option>
          </select>
        </div>
        <div class="field">
          <label>DeepSeek API Key（{{ ai.hasKey ? '已配置，留空保持不变' : '未配置' }}）</label>
          <input v-model="aiKey" type="password" autocomplete="new-password" placeholder="sk-…（deepseek 官方平台获取）" />
        </div>
        <div class="set-actions">
          <button class="btn primary" :disabled="aiSaving" @click="saveAi">
            {{ aiSaving ? '保存中…' : '保存 AI 设置' }}
          </button>
          <button class="btn" :disabled="aiTesting || !ai.hasKey" @click="testAi">
            {{ aiTesting ? '测试中…' : '测试连接' }}
          </button>
          <span v-if="aiMsg" style="color: var(--ok); font-size: 13px">{{ aiMsg }}</span>
          <span v-if="aiErr" style="color: var(--danger); font-size: 13px">{{ aiErr }}</span>
        </div>
        <p class="row-tip">提示：AI 结果可能存在错误或幻觉，插入的内容带有「✨ AI 补全」标记便于与原文区分与核验。</p>
      </div>
    </div>

    <div class="set-section">
      <h3 class="set-title">备份</h3>
      <div class="set-card">
        <p style="margin: 0 0 4px; font-size: 13.5px; color: var(--tx-2)">
          单向备份到 WebDAV（坚果云 / NAS）。每次生成含数据库与全部图片的
          <code>quicknote-时间戳.zip</code>，本地保留最近 5 份。
        </p>

        <label class="switch-row">
          <input v-model="form.enabled" type="checkbox" />
          <span>启用 WebDAV 备份</span>
        </label>
        <div class="field">
          <label>服务地址</label>
          <input v-model="form.url" type="text" placeholder="https://dav.jianguoyun.com/dav/" />
        </div>
        <div class="field">
          <label>用户名</label>
          <input v-model="form.username" type="text" autocomplete="off" placeholder="坚果云账号 / WebDAV 用户名" />
        </div>
        <div class="field">
          <label>密码（留空表示不修改）</label>
          <input v-model="form.password" type="password" autocomplete="new-password" />
        </div>
        <div class="field">
          <label>远端目录</label>
          <input v-model="form.remoteDir" type="text" placeholder="/QuickNote" />
        </div>

        <label class="switch-row" style="margin-top: 14px">
          <input v-model="autoBackup.enabled" type="checkbox" />
          <span>定时自动备份</span>
        </label>
        <div class="field" style="max-width: 220px">
          <label>间隔（小时）</label>
          <input v-model.number="autoBackup.everyHours" type="number" min="1" step="1" />
        </div>

        <div class="set-actions">
          <button class="btn primary" :disabled="saving" @click="saveBackup">
            {{ saving ? '保存中…' : '保存备份设置' }}
          </button>
          <button class="btn" :disabled="running" @click="runNow">
            {{ running ? '备份中…' : '立即备份一次' }}
          </button>
          <span v-if="message" style="color: var(--ok); font-size: 13px">{{ message }}</span>
        </div>
        <p v-if="result" class="row-tip">{{ result }}</p>
      </div>
    </div>

    <div class="set-section">
      <h3 class="set-title">说明</h3>
      <div class="set-card">
        <p class="row-tip" style="margin: 0">
          快记 · QuickNote —— 单机本地笔记。所有数据保存在本机 <code>server/data</code>，
          服务默认仅监听本机；开放局域网需自行设置 <code>QUICKNOTE_HOST=0.0.0.0</code>，且无账号体系，请仅在可信网络使用。
        </p>
      </div>
    </div>
  </div>
</template>
