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
