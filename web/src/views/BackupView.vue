<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const form = reactive({
  enabled: false,
  url: '',
  username: '',
  password: '', // 留空表示不修改
  remoteDir: '/QuickNote'
});
const autoBackup = reactive({ enabled: false, everyHours: 24 });
const loading = ref(true);
const saving = ref(false);
const running = ref(false);
const message = ref('');
const result = ref('');

async function loadConfig() {
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
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  saving.value = true;
  message.value = '';
  try {
    const cfg = await api.saveBackupConfig({
      webdav: {
        enabled: form.enabled,
        url: form.url.trim(),
        username: form.username.trim(),
        password: form.password, // 空串 → 服务端保持不变
        remoteDir: form.remoteDir.trim() || '/QuickNote'
      },
      autoBackup: {
        enabled: autoBackup.enabled,
        everyHours: Math.max(1, Number(autoBackup.everyHours) || 24)
      }
    });
    Object.assign(form, { enabled: !!cfg.webdav.enabled, remoteDir: cfg.webdav.remoteDir });
    message.value = '设置已保存 ✓';
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

onMounted(loadConfig);
</script>

<template>
  <div style="max-width: 640px">
    <h2 style="margin: 4px 0 18px">备份设置</h2>
    <p style="color: var(--text-2)">
      备份为<strong>单向上传</strong>（本地 → WebDAV），云端目录仅作备份仓。支持坚果云、NAS 等 WebDAV 服务。
      每次备份会生成一个包含数据库与全部图片的 <code>quicknote-时间戳.zip</code>，同时保存在本地 backups 目录（保留最近 5 份）。
    </p>

    <div v-if="loading" class="empty-state">加载中…</div>
    <form v-else class="card" @submit.prevent="saveConfig">
      <h3 style="margin: 0 0 10px">WebDAV 云端</h3>

      <label class="row check">
        <input v-model="form.enabled" type="checkbox" />
        <span>启用 WebDAV 备份</span>
      </label>

      <label class="row">
        <span>服务地址</span>
        <input v-model="form.url" type="url" placeholder="https://dav.jianguoyun.com/dav/" />
      </label>
      <label class="row">
        <span>账号</span>
        <input v-model="form.username" type="text" autocomplete="off" placeholder="坚果云账号 / WebDAV 用户名" />
      </label>
      <label class="row">
        <span>密码</span>
        <input v-model="form.password" type="password" autocomplete="new-password" placeholder="留空表示不修改" />
      </label>
      <label class="row">
        <span>远端目录</span>
        <input v-model="form.remoteDir" type="text" placeholder="/QuickNote" />
      </label>

      <h3 style="margin: 20px 0 10px">定时自动备份</h3>
      <label class="row check">
        <input v-model="autoBackup.enabled" type="checkbox" />
        <span>启用定时备份</span>
      </label>
      <label class="row">
        <span>间隔（小时）</span>
        <input v-model.number="autoBackup.everyHours" type="number" min="1" step="1" style="width: 120px" />
      </label>

      <div class="actions">
        <button type="submit" class="primary" :disabled="saving">{{ saving ? '保存中…' : '保存设置' }}</button>
        <button type="button" :disabled="running" @click="runNow">
          {{ running ? '备份中…' : '立即备份一次' }}
        </button>
        <span v-if="message" style="color: #1a7f37">{{ message }}</span>
      </div>
    </form>

    <p v-if="result" class="result">{{ result }}</p>

    <p class="hint">
      💡 说明：WebDAV 凭据以明文保存在本地配置文件 <code>server/data/config.json</code> 中，仅供本机访问；
      若你的机器可能被他人使用，建议改用坚果云「应用密码」而非主账号密码。
    </p>
  </div>
</template>

<style scoped>
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px 20px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
  color: var(--text-2);
}

.row span:first-child {
  width: 110px;
  flex-shrink: 0;
  text-align: right;
  font-size: 13px;
}

.row input[type='text'],
.row input[type='url'],
.row input[type='password'] {
  flex: 1;
}

.row.check {
  cursor: pointer;
  color: var(--text);
}

.row.check span {
  width: auto;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}

.result {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-all;
}

.hint {
  font-size: 12px;
  color: var(--text-3);
}

/* 移动端：表单项改为纵向堆叠 */
@media (max-width: 760px) {
  .row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    margin: 12px 0;
  }

  .row span:first-child {
    width: auto;
    text-align: left;
  }

  .row input[type='text'],
  .row input[type='url'],
  .row input[type='password'] {
    width: 100%;
  }

  .actions {
    flex-wrap: wrap;
  }
}
</style>
