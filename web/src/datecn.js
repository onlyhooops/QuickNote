// 日期/农历/节日工具
import { Solar } from 'lunar-javascript';

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const pad = (n) => String(n).padStart(2, '0');

export function localDateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 返回一个时刻的展示信息：
 * dateText/月日/星期/公历节日/农历(月日)/农历节日/节气/时分
 */
export function dateInfo(d = new Date()) {
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const mi = d.getMinutes();

  let festivals = [];
  let lunarText = '';
  try {
    const solar = Solar.fromYmd(y, mo, day);
    const lunar = solar.getLunar();
    lunarText = String(lunar.toString() || '');
    // '二〇二六年七月廿三' → 取「年」后的月日部分
    const idx = lunarText.indexOf('年');
    const short = idx >= 0 ? lunarText.slice(idx + 1) : lunarText;
    const seen = new Set();
    for (const f of [...(solar.getFestivals() || []), ...(lunar.getFestivals() || [])]) {
      if (f && !seen.has(f)) {
        seen.add(f);
        festivals.push(f);
      }
    }
    const jq = lunar.getJieQi();
    if (jq && !seen.has(jq)) festivals.push(jq);
    lunarText = short;
  } catch {
    /* 极端日期兜底 */
  }

  return {
    key: localDateKey(d),
    year: y,
    month: mo,
    day,
    dateText: `${y}年${mo}月${day}日`,
    monthDay: `${mo}月${day}日`,
    weekday: WEEK[d.getDay()],
    lunar: lunarText,
    festivals,
    time: `${pad(h)}:${pad(mi)}`,
    clock: `${pad(h)}:${pad(mi)}:${pad(d.getSeconds())}`,
    iso: d.toISOString()
  };
}

/** 去年同月同日（2/29 → 2/28） */
export function lastYearDate(now = new Date()) {
  const y = now.getFullYear() - 1;
  const mo = now.getMonth() + 1;
  let day = now.getDate();
  if (mo === 2 && day === 29) day = 28;
  return { year: y, month: mo, day, key: `${y}-${pad(mo)}-${pad(day)}` };
}
