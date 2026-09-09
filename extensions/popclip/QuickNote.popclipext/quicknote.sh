#!/usr/bin/env bash
# 记入快记 —— 把选中内容写入本机 QuickNote 服务
# 说明：PopClip 的 JS 网络受 ATS 限制仅 https，本地 http 需 shell + curl。
# 排版：默认发送 POPCLIP_HTML（网页富文本，保留标题/列表/引用/代码块/表格）；
#       扩展选项「排版方式」选 Markdown 源码时发送 POPCLIP_MARKDOWN；
#       两者都不可用/超限时回退 POPCLIP_TEXT。服务端仍会再净化一次。
# 以下两行会被「设置 → 快捷写入 → 下载插件」按当前服务地址/令牌改写（留空即用默认值）。
BASE_BAKED=''
TOKEN_BAKED=''
set -uo pipefail

base="${POPCLIP_OPTION_BASEURL:-${BASE_BAKED:-http://127.0.0.1:3987}}"
token="${POPCLIP_OPTION_TOKEN:-$TOKEN_BAKED}"
tmpdir="$(mktemp -d 2>/dev/null || mktemp -d -t quicknote)"
trap 'rm -rf "$tmpdir"' EXIT

curl_args=( -sS -o /dev/null -w '%{http_code}' -X POST "$base/api/quickin" --data-urlencode "text@-" )

# 排版字段：默认 html；选项「排版方式」= markdown 时用 markdown；超限则不附带（服务端回退 text）
payload_kind=""
payload_limit=0
if [ "${POPCLIP_OPTION_FORMAT:-html}" = "markdown" ] && [ -n "${POPCLIP_MARKDOWN:-}" ]; then
  payload_kind="markdown"
  payload_limit=100000
  printf '%s' "$POPCLIP_MARKDOWN" > "$tmpdir/payload"
elif [ -n "${POPCLIP_HTML:-}" ]; then
  payload_kind="html"
  payload_limit=200000
  printf '%s' "$POPCLIP_HTML" > "$tmpdir/payload"
fi
if [ -n "$payload_kind" ]; then
  size="$(wc -c < "$tmpdir/payload" | tr -d ' ')"
  if [ "${size:-0}" -le "$payload_limit" ]; then
    curl_args+=( --data-urlencode "$payload_kind@$tmpdir/payload" )
  fi
fi

# 来源：仅当选中内容来自「支持的浏览器」网页时，PopClip 才提供
# POPCLIP_BROWSER_URL/POPCLIP_BROWSER_TITLE（其余应用内摘抄为空 → 不标来源）。
if [ -n "${POPCLIP_BROWSER_URL:-}" ]; then
  case "$POPCLIP_BROWSER_URL" in
    http://*|https://*)
      curl_args+=( --data-urlencode "url=$POPCLIP_BROWSER_URL" )
      if [ -n "${POPCLIP_BROWSER_TITLE:-}" ]; then
        curl_args+=( --data-urlencode "title=$POPCLIP_BROWSER_TITLE" )
      fi ;;
  esac
fi
if [ -n "${POPCLIP_OPTION_TAGS:-}" ]; then
  curl_args+=( --data-urlencode "tags=$POPCLIP_OPTION_TAGS" )
fi
if [ -n "$token" ]; then
  curl_args+=( -H "X-QuickNote-Token: $token" )
fi

code="$(printf '%s' "${POPCLIP_TEXT:-}" | /usr/bin/curl "${curl_args[@]}")" || code=""
case "$code" in
  200|201) exit 0 ;;
  *) echo "记入快记失败（HTTP ${code:-无法连接}）" >&2; exit 1 ;;
esac
