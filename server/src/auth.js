import { loadConfig } from './config.js';

/**
 * 敏感信息门控：
 *  - 本机回环（127.0.0.1 / ::1）直通；
 *  - 非回环时：若配置了 quickin.token，要求请求头 X-QuickNote-Token 匹配；
 *  - 未配置令牌且非回环时默认放行（应用无账号体系，仅建议可信网络使用）。
 */
export function secretAllowed(req) {
  const ip = String(req.socket?.remoteAddress || '');
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  const tk = loadConfig().quickin?.token;
  if (!tk) return true;
  return String(req.headers['x-quicknote-token'] || '') === tk;
}
