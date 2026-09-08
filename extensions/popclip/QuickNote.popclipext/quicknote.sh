#!/usr/bin/env bash
# 记入快记 —— 把 POPCLIP_TEXT 写入本机 QuickNote 服务
# 说明：PopClip 的 JS 网络受 ATS 限制仅 https，本地 http 需 shell + curl。
# 以下两行会被「设置 → 快捷写入 → 下载插件」按当前服务地址/令牌改写（留空即用默认值）。
BASE_BAKED=''
TOKEN_BAKED=''
set -uo pipefail

base="${POPCLIP_OPTION_BASEURL:-${BASE_BAKED:-http://127.0.0.1:3987}}"
token="${POPCLIP_OPTION_TOKEN:-$TOKEN_BAKED}"
curl_args=( -sS -o /dev/null -w '%{http_code}' -X POST "$base/api/quickin" --data-urlencode "text@-" )
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
