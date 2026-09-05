// 网页解析 / 嵌入组件辅助：识别主流平台链接 → 内嵌 iframe 或简约链接卡（Nothing 风）
import { Node, mergeAttributes } from '@tiptap/core';

/** 识别 YouTube / Bilibili / Apple Music 链接，返回 { provider, iframe, h } */
export function embedInfo(urlStr) {
  const raw = String(urlStr || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const h = u.hostname;

  // YouTube
  if (/(^|\.)youtu\.be$/.test(h)) {
    const id = u.pathname.replace(/^\//, '').split('?')[0] || '';
    if (id) return { provider: 'youtube', iframe: `https://www.youtube.com/embed/${id}` };
  }
  if (/(^|\.)youtube\.com$/.test(h)) {
    const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean)[1] || '';
    if (id && !/^channel|user|c\/|playlist$/i.test(id)) {
      return { provider: 'youtube', iframe: `https://www.youtube.com/embed/${id}` };
    }
  }

  // Bilibili
  if (/(^|\.)bilibili\.com$/.test(h)) {
    const m =
      u.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/) ||
      u.pathname.match(/(BV[0-9A-Za-z]{10,})/) ||
      String(u.searchParams.get('bvid') || '');
    const bvid = m && typeof m === 'string' ? m : m && m[1];
    if (bvid && /^BV[0-9A-Za-z]{8,}$/.test(bvid)) {
      return { provider: 'bilibili', iframe: `https://player.bilibili.com/player.html?bvid=${bvid}&page=1` };
    }
  }

  // Apple Music：官方嵌入地址 embed.music.apple.com/{song|album|playlist}/{id}?theme=light
  if (/(^|\.)music\.apple\.com$/.test(h)) {
    const trackId = u.searchParams.get('i');
    if (trackId && /^\d+$/.test(trackId)) {
      return { provider: 'apple', type: 'song', iframe: `https://embed.music.apple.com/song/${trackId}?theme=light`, h: 175 };
    }
    const seg = u.pathname.split('/').filter(Boolean);
    const type = seg.find((s) => /^(song|album|playlist)$/.test(s)) || 'album';
    const id = seg.filter((s) => /^\d+$/.test(s)).pop();
    if (id) {
      const h = /^song$/.test(type) ? 175 : 450;
      return { provider: 'apple', type, iframe: `https://embed.music.apple.com/${type}/${id}?theme=light`, h };
    }
    return null;
  }

  return null;
}

function safeAttr(v) {
  return v == null ? '' : String(v).replace(/"/g, '&quot;').slice(0, 600);
}
function hostOf(href) {
  try {
    return new URL(href || '').hostname;
  } catch {
    return '';
  }
}
function favOf(host) {
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : '';
}

/** Tiptap 自定义节点：视频/音乐 iframe 嵌入，或简约链接卡 */
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: '' },
      provider: { default: '' },
      iframe: { default: '' },
      h: { default: 0 },
      title: { default: '' },
      desc: { default: '' },
      thumb: { default: '' }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed]',
        getAttrs: (el) => ({
          href: el.getAttribute('data-href') || '',
          provider: el.getAttribute('data-provider') || '',
          iframe: el.getAttribute('data-iframe') || '',
          h: Number(el.getAttribute('data-h')) || 0,
          title: el.getAttribute('data-title') || '',
          desc: el.getAttribute('data-desc') || '',
          thumb: el.getAttribute('data-thumb') || ''
        })
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { iframe, provider, href, title, desc, thumb, h } = HTMLAttributes;
    const data = {
      'data-embed': '',
      'data-href': safeAttr(href),
      'data-provider': safeAttr(provider),
      'data-iframe': safeAttr(iframe),
      'data-h': safeAttr(h),
      'data-title': safeAttr(title),
      'data-desc': safeAttr(desc),
      'data-thumb': safeAttr(thumb),
      class: `qn-embed ${provider ? 'qn-embed-' + provider : 'qn-embed-card'}`
    };

    // 视频 / 音乐：内嵌 iframe（Apple 用官方高度，其余 16:9 铺宽）
    if (iframe) {
      const hh = Number(h) || 0;
      const style = hh
        ? `width:100%;max-width:660px;height:${hh}px;border:0;border-radius:12px;background:#000;display:block`
        : '';
      return [
        'div',
        mergeAttributes(data),
        [
          'iframe',
          {
            src: iframe,
            loading: 'lazy',
            allow: 'autoplay *; encrypted-media *; fullscreen *; clipboard-write',
            allowfullscreen: 'true',
            scrolling: 'no',
            frameBorder: '0',
            ...(style ? { style } : {})
          }
        ]
      ];
    }

    // 简约链接卡（Nothing 风）
    const host = hostOf(href);
    const fav = favOf(host);
    return [
      'div',
      mergeAttributes(data),
      [
        'a',
        { href, target: '_blank', rel: 'noopener' },
        [
          'div',
          { class: 'qn-embed-corner' },
          fav ? ['img', { src: fav, alt: '', class: 'qn-embed-fav' }] : '',
          [
            'div',
            { class: 'qn-embed-info' },
            title ? ['div', { class: 'qn-embed-title' }, title] : '',
            desc ? ['div', { class: 'qn-embed-desc' }, desc] : '',
            host ? ['div', { class: 'qn-embed-host' }, host] : ''
          ],
          thumb ? ['img', { src: thumb, alt: '', class: 'qn-embed-thumb' }] : '',
          ['span', { class: 'qn-embed-arrow' }, '↗']
        ]
      ]
    ];
  }
});
