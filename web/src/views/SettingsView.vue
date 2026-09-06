<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { applyTheme, getThemePref, setThemePref } from '../theme.js';
import { SCHEMES, getScheme, setScheme } from '../font.js';
import { Eye, EyeOff, Download, RefreshCw, Copy, Check } from 'lucide-vue-next';

const APP_VERSION = __APP_VERSION__;
const BUILD_TIME = __BUILD_TIME__;
const REPO_URL = 'https://github.com/onlyhooops/QuickNote';

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

// ================= AI 助手 =================
const ai = reactive({ enabled: false, model: 'deepseek-v4-flash', effort: 'high', hasKey: false });
const aiKey = ref('');
const aiShow = ref(false); // Key 明文显示开关
const aiSaving = ref(false);
const aiTesting = ref(false);
const aiMsg = ref('');
const aiErr = ref('');

const EFFORT_LABEL = { high: '高', low: '低', max: '最大', off: '关闭思考' };
const MODEL_LABEL = {
  'deepseek-v4-flash': 'deepseek-v4-flash（快）',
  'deepseek-v4-pro': 'deepseek-v4-pro（更强）',
  'deepseek-v4-flash-vision-exp': 'deepseek-v4-flash-vision-exp（视觉）'
};

/** 从本机 QuickNote 令牌存储取请求头（局域网访问敏感接口时用） */
function qiHeaders() {
  const t = localStorage.getItem('quicknote.qi.token');
  return t ? { 'X-QuickNote-Token': t } : {};
}
function storeQiToken(t) {
  try {
    if (t) localStorage.setItem('quicknote.qi.token', t);
    else localStorage.removeItem('quicknote.qi.token');
  } catch {
    /* ignore */
  }
}

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
    aiMsg.value = aiKey.value ? '已保存（Key 已保留在输入框，可核对）✓' : '已保存 ✓';
  } catch (e) {
    aiErr.value = '保存失败：' + e.message;
  } finally {
    aiSaving.value = false;
  }
}
/** 测试连接：输入框里填了新 Key 就用它测（无需先保存），否则用已存 Key */
async function testAi() {
  aiTesting.value = true;
  aiErr.value = '';
  aiMsg.value = '';
  try {
    const body = aiKey.value.trim() ? { apiKey: aiKey.value.trim() } : undefined;
    await api.testAi(body);
    aiMsg.value = '连接正常 ✓';
  } catch (e) {
    aiErr.value = '连接失败：' + e.message;
  } finally {
    aiTesting.value = false;
  }
}
/** 从服务端读回已保存的 Key（仅本机或携带令牌时可读），便于核对 */
async function loadStoredAiKey() {
  aiErr.value = '';
  aiMsg.value = '';
  try {
    const r = await api.getAiKey(qiHeaders());
    if (!r.apiKey) {
      aiErr.value = '服务端当前没有已保存的 Key';
      return;
    }
    aiKey.value = r.apiKey;
    aiShow.value = true;
    aiMsg.value = '已载入服务端保存的 Key（仅此页可见，不会外传）';
  } catch (e) {
    aiErr.value = e.message;
  }
}

const canTestAi = computed(() => ai.hasKey || !!aiKey.value.trim());

// ================= 快捷写入（PopClip） =================
const qi = reactive({ enabled: true, hasToken: false, lastToken: '' });
const qiMsg = ref('');
const qiErr = ref('');
const qiBusy = ref(false);

async function loadQi() {
  try {
    const c = await api.getQuickinConfig();
    qi.enabled = c.enabled !== false;
    qi.hasToken = !!c.hasToken;
  } catch {
    /* ignore */
  }
}
async function toggleQi() {
  try {
    const r = await api.saveQuickinConfig({ enabled: qi.enabled });
    qi.enabled = r.enabled !== false;
    qiMsg.value = '已保存 ✓';
  } catch (e) {
    qi.enabled = !qi.enabled;
    qiErr.value = '保存失败：' + e.message;
  }
}
async function copyText(t) {
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
async function copyQiToken() {
  qiBusy.value = true;
  qiErr.value = '';
  qiMsg.value = '';
  try {
    const r = await api.getQuickinToken(qiHeaders());
    if (!r.token) {
      qiErr.value = '尚未生成令牌——点击「生成新令牌」即可';
      return;
    }
    qi.lastToken = r.token;
    qi.hasToken = true;
    storeQiToken(r.token);
    qiMsg.value = (await copyText(r.token)) ? '令牌已复制到剪贴板 ✓' : '令牌：' + r.token;
  } catch (e) {
    qiErr.value = e.message;
  } finally {
    qiBusy.value = false;
  }
}
async function genQiToken() {
  qiBusy.value = true;
  qiErr.value = '';
  qiMsg.value = '';
  try {
    const r = await api.rotateQuickinToken(qiHeaders());
    qi.lastToken = r.token;
    qi.hasToken = true;
    storeQiToken(r.token);
    qiMsg.value = '已生成新令牌并复制（旧令牌即刻失效，请重新下载插件）✓';
    await copyText(r.token);
  } catch (e) {
    qiErr.value = e.message;
  } finally {
    qiBusy.value = false;
  }
}
async function clearQiToken() {
  qiBusy.value = true;
  qiErr.value = '';
  qiMsg.value = '';
  try {
    await api.clearQuickinToken(qiHeaders());
    qi.hasToken = false;
    qi.lastToken = '';
    storeQiToken('');
    qiMsg.value = '已清除令牌（快捷写入恢复为不鉴权）';
  } catch (e) {
    qiErr.value = e.message;
  } finally {
    qiBusy.value = false;
  }
}
async function downloadExt() {
  qiBusy.value = true;
  qiErr.value = '';
  qiMsg.value = '';
  try {
    await api.downloadQuickinExtension(qiHeaders());
    qiMsg.value = 'QuickNote.popclipextz 已开始下载，双击安装到 PopClip 即可 ✓';
  } catch (e) {
    qiErr.value = e.message;
  } finally {
    qiBusy.value = false;
  }
}

// ================= 备份（WebDAV） =================
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
    form.password = '';
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

// ================= 关于 / 更新检查（只读） =================
const about = ref(null); // GET /api/update/meta
const up = ref(null); // GET /api/update/status 或 POST /api/update/check 结果
const upBusy = ref(false);
const upMsg = ref('');
const upErr = ref('');

const buildLabel = computed(() => {
  const d = new Date(BUILD_TIME);
  if (Number.isNaN(d.getTime())) return BUILD_TIME;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
});

/** /api/update/meta 返回的运行库/框架版本（设置 → 关于 → 版本与运行信息） */
const vf = computed(() => about.value?.versions || {});

async function loadAbout() {
  try {
    const m = await api.getMeta();
    about.value = m;
    up.value = { ...m, remote: null };
  } catch (e) {
    upErr.value = '读取版本信息失败：' + e.message;
  }
}
async function checkUpdate() {
  upBusy.value = true;
  upErr.value = '';
  upMsg.value = '正在连接代码仓库检查版本…';
  try {
    const r = await api.checkUpdate();
    up.value = r;
    if (r.sameHead) upMsg.value = '已是最新版本 ✓';
    else if (r.behind > 0) upMsg.value = `发现 ${r.behind} 个新提交（远端领先本地）`;
    else if (r.ahead > 0) upMsg.value = `本地领先远端 ${r.ahead} 个提交（未推送）`;
    else if (r.dirty) upMsg.value = '本地有未提交改动';
    else upMsg.value = '本地与远端一致';
  } catch (e) {
    upErr.value = '检查失败：' + e.message;
    upMsg.value = '';
  } finally {
    upBusy.value = false;
  }
}
function fmtGitDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

onMounted(() => {
  loadBackup();
  loadAi();
  loadQi();
  loadAbout();
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
          可选功能：在记录编辑器点「✨ AI 探索」，对<strong>纯文字部分</strong>做「溯源」与「扩展」
          （不含图片/网页卡/音乐/视频卡片）。API Key 仅存本机服务端，不会外传；
          输入框可用「眼睛」切换明文，便于核对。
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
            <option value="deepseek-v4-flash-vision-exp">deepseek-v4-flash-vision-exp（视觉实验）</option>
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
          <div class="key-row">
            <input
              v-model="aiKey"
              :type="aiShow ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="sk-…（deepseek 官方平台获取）"
            />
            <button
              class="icon-btn"
              type="button"
              :title="aiShow ? '隐藏 Key' : '显示 Key'"
              :disabled="!aiKey"
              @click="aiShow = !aiShow"
            >
              <EyeOff v-if="aiShow" :size="16" :stroke-width="1.8" />
              <Eye v-else :size="16" :stroke-width="1.8" />
            </button>
          </div>
          <p class="row-tip" style="margin: 6px 0 0">
            Key 会持久保存在本机服务端（<code>server/data/config.json</code>）。保存后输入框不会清空，便于当场核对。
          </p>
        </div>
        <div class="set-actions" style="flex-wrap: wrap">
          <button class="btn primary" :disabled="aiSaving" @click="saveAi">
            {{ aiSaving ? '保存中…' : '保存 AI 设置' }}
          </button>
          <button class="btn" :disabled="aiTesting || !canTestAi" @click="testAi">
            {{ aiTesting ? '测试中…' : '测试连接' }}
          </button>
          <button class="btn ghost" :disabled="!ai.hasKey" @click="loadStoredAiKey">
            读取已存 Key
          </button>
          <span v-if="aiMsg" style="color: var(--ok); font-size: 13px">{{ aiMsg }}</span>
          <span v-if="aiErr" style="color: var(--danger); font-size: 13px">{{ aiErr }}</span>
        </div>
        <p class="row-tip">
          提示：填写新 Key 后可直接「测试连接」（无需先保存）；AI 结果可能存在错误或幻觉，
          插入的内容带有「✨ AI 补全」标记便于与原文区分与核验。
        </p>
      </div>
    </div>

    <div class="set-section">
      <h3 class="set-title">快捷写入 · PopClip（macOS）</h3>
      <div class="set-card">
        <p style="margin: 0 0 8px; font-size: 13px; color: var(--tx-2)">
          在 macOS 上选中文字 → 菜单「记入快记」，即可把选中内容写入本应用生成时间点。
          令牌可防止局域网内他人向 <code>/api/quickin</code> 随意写入；
          <strong>下载插件会按当前服务地址与令牌现场打包</strong>，安装即用。
        </p>

        <label class="switch-row">
          <input v-model="qi.enabled" type="checkbox" @change="toggleQi" />
          <span>启用快捷写入接口</span>
        </label>

        <div class="field">
          <label>访问令牌（{{ qi.hasToken ? '已设置 · 旧插件在轮换后需重新下载' : '未设置 · 接口不鉴权' }}）</label>
          <div class="set-actions" style="flex-wrap: wrap">
            <button class="btn" :disabled="qiBusy" @click="genQiToken">
              <RefreshCw :size="14" :stroke-width="1.8" /> {{ qi.hasToken ? '重新生成令牌' : '生成新令牌' }}
            </button>
            <button class="btn" :disabled="qiBusy || !qi.hasToken" @click="copyQiToken">
              <Copy :size="14" :stroke-width="1.8" /> 复制令牌
            </button>
            <button class="btn ghost" :disabled="qiBusy || !qi.hasToken" @click="clearQiToken">
              清除令牌
            </button>
          </div>
        </div>

        <div class="field" style="margin-top: 6px">
          <label>PopClip 插件下载</label>
          <div class="set-actions" style="flex-wrap: wrap">
            <button class="btn primary" :disabled="qiBusy" @click="downloadExt">
              <Download :size="14" :stroke-width="1.8" /> 下载 QuickNote.popclipextz
            </button>
            <span v-if="qiMsg" style="color: var(--ok); font-size: 13px">{{ qiMsg }}</span>
            <span v-if="qiErr" style="color: var(--danger); font-size: 13px">{{ qiErr }}</span>
          </div>
          <p class="row-tip">
            下载后双击 <code>.popclipextz</code> 安装到 PopClip；在 PopClip 扩展设置里可改
            「服务地址」（如局域网 <code>http://192.168.1.6:3987</code>）与「默认标签」。
          </p>
        </div>
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
        <p class="row-tip" style="margin: 0 0 10px">
          快记 · QuickNote —— 单机本地笔记。所有数据保存在本机 <code>server/data</code>，
          服务默认仅监听本机；开放局域网需自行设置 <code>QUICKNOTE_HOST=0.0.0.0</code>。
        </p>
        <div class="about-notes">
          <p><strong>网络与部署安全</strong></p>
          <ul>
            <li>应用无账号体系、无登录鉴权：默认仅监听 <code>127.0.0.1</code>（本机）。</li>
            <li>开放局域网后，任何能访问到该端口的人均可读写全部笔记——请只在可信网络使用，并建议在「快捷写入」中设置访问令牌。</li>
            <li><strong>警告：本项目由个人开发者维护，请勿部署到公网或用于生产环境</strong>——未做多用户鉴权、限流、防爆破与安全加固，公网暴露存在数据泄露与被滥用的风险，作者不承担由此产生的任何后果。</li>
          </ul>
          <p><strong>AI / API Key 安全</strong></p>
          <ul>
            <li>DeepSeek API Key 仅保存在本机 <code>server/data/config.json</code>，接口不回传明文；请勿把 <code>config.json</code>、日志或数据目录外传、备份到公开位置或提交进公开仓库。</li>
            <li>「读取已存 Key / 查看令牌」等敏感接口默认仅本机可访问；从其他设备访问需携带令牌。</li>
            <li>AI 输出可能错误或存在幻觉，含 AI 内容请结合原文核验后再采用。</li>
          </ul>
          <p><strong>备份与数据</strong></p>
          <ul>
            <li>WebDAV 密码以明文保存在本机配置文件；远程备份请优先使用私有 WebDAV（如坚果云应用密码、自建 NAS）。</li>
            <li>请定期自行备份：数据丢失风险自负。</li>
          </ul>
          <p><strong>免责声明</strong></p>
          <ul>
            <li>个人开发者作品，按“现状”提供，无任何明示或默示担保；因使用本软件造成的数据丢失或任何损失，作者不承担责任。</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="set-section">
      <h3 class="set-title">关于</h3>
      <div class="set-card">
        <p class="about-intro">
          快记 QuickNote —— 一枚单机本地优先的极简快速笔记：打开即写、回车即存，
          每条记录化作时间线上的一个光点；支持富文本、图片、链接卡片、音乐/视频嵌入、标签与检索，
          以及随览、回响（历史上的今天）等回顾玩法，所有数据仅保存在本机。
        </p>

        <div class="about-notes about-decl">
          <p><strong>开发背景与声明</strong></p>
          <ul>
            <li><strong>项目缘起</strong>：本项目由开发者结合自身记录习惯与实际需求独立构思、设计与持续维护，属个人自用项目（非商业产品、非团队项目）。</li>
            <li><strong>AI 辅助开发</strong>：在编码、联调、测试与文档整理等环节，大量借助了 DeepSeek 大模型与 DeepSeek Harness 自动化工具链辅助完成（详见下方「版本与运行信息 → 协作开发」）。</li>
            <li><strong>质量与安全声明</strong>：鉴于项目以个人自用为目的，且相当一部分代码由 AI 辅助产出，作者<strong>无法对代码质量、稳定性与安全性作出任何明示或默示的保证</strong>；请仅在可信、非生产环境中使用并自行评估风险，重要数据请自行定期备份——由此产生的任何数据丢失或损失，作者不承担责任。</li>
          </ul>
        </div>

        <p class="about-sub">版本与运行信息</p>
        <div class="about-rows">
          <div class="about-row">
            <span class="k">版本</span>
            <span class="v">v{{ APP_VERSION }}<template v-if="about?.git?.short"> · {{ about.git.short }}（{{ fmtGitDate(about.git.date) }}）</template></span>
          </div>
          <div class="about-row"><span class="k">提交说明</span><span class="v">{{ about?.git?.subject || '—' }}</span></div>
          <div class="about-row"><span class="k">编译时间</span><span class="v">{{ buildLabel }}</span></div>
          <div class="about-row"><span class="k">运行环境</span><span class="v">Node {{ vf.node || '—' }} · {{ vf.platform || '—' }}</span></div>
          <div class="about-row"><span class="k">前端框架</span><span class="v">Vue {{ vf.vue || '—' }} · Vite {{ vf.vite || '—' }} · Tiptap {{ vf.tiptap || '—' }}</span></div>
          <div class="about-row"><span class="k">后端框架</span><span class="v">Express {{ vf.express || '—' }} · SQLite（node:sqlite）</span></div>
          <div class="about-row">
            <span class="k">AI 模型</span>
            <span class="v">{{ MODEL_LABEL[ai.model] || ai.model }}（{{ ai.enabled ? '已启用' : '未启用' }}） · 思考{{ EFFORT_LABEL[ai.effort] || ai.effort }}</span>
          </div>
          <div class="about-row">
            <span class="k">协作开发</span>
            <span class="v">DeepSeek Harness 自动化工具链 · DeepSeek 大模型（deepseek-v4-flash / deepseek-v4-pro）辅助完成</span>
          </div>
          <div class="about-row">
            <span class="k">项目仓库</span>
            <span class="v"><a :href="REPO_URL" target="_blank" rel="noopener">{{ REPO_URL }}</a></span>
          </div>
        </div>

        <div class="about-update">
          <p style="font-size: 13px; font-weight: 600; margin: 0 0 6px">检查更新（只读）</p>
          <p class="row-tip" style="margin: 0 0 8px">
            点击后仅<strong>检测</strong>代码仓库（GitHub <code>main</code> 分支）与本地版本的差异，
            不会拉代码、构建或重启。检测需服务器能访问 GitHub 且为 git 部署；实际更新请在服务器执行
            <code>sudo bash deploy/update.sh</code>。
          </p>
          <div class="set-actions" style="flex-wrap: wrap">
            <button class="btn" :disabled="upBusy" @click="checkUpdate">
              {{ upBusy ? '检查中…' : '检查更新' }}
            </button>
            <span v-if="upMsg" style="color: var(--ok); font-size: 13px">{{ upMsg }}</span>
            <span v-if="upErr" style="color: var(--danger); font-size: 13px">{{ upErr }}</span>
          </div>
          <div v-if="up?.capability" class="about-env">
            <span class="env-item" :class="{ bad: !up.capability.isGitRepo }">git 仓库{{ up.capability.isGitRepo ? '✓' : '✗' }}</span>
            <span class="env-item" :class="{ bad: !up.capability.systemdService }">systemd 服务{{ up.capability.systemdService ? '✓' : '✗' }}</span>
            <span class="env-item" :class="{ bad: !up.capability.runningAsRoot }">root 运行{{ up.capability.runningAsRoot ? '✓' : '✗' }}</span>
            <template v-if="up.remote">
              <span class="env-item">远端 {{ up.remote.short }}（{{ up.remote.subject }}）</span>
              <span v-if="up.behind > 0" class="env-item warn">落后 {{ up.behind }} 个提交</span>
              <span v-if="up.ahead > 0" class="env-item warn">领先 {{ up.ahead }} 个提交</span>
              <span v-if="up.dirty" class="env-item warn">本地有未提交改动</span>
            </template>
            <template v-else-if="up?.local">
              <span class="env-item">本地 {{ up.local.short }}（{{ up.local.subject }}）</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
