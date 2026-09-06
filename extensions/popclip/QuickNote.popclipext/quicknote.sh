#!/usr/bin/env bash
# 记入快记 —— 把 POPCLIP_TEXT 写入本机 QuickNote 服务
# 说明：PopClip 的 JS 网络受 ATS 限制仅 https，本地 http 需 shell + curl。
set -uo pipefail

base="${POPCLIP_OPTION_BASEURL:-http://127.0.0.1:3987}"
curl_args=( -sS -o /dev/null -w '%{http_code}' -X POST "$base/api/quickin" --data-urlencode "text@-" )
if [ -n "${POPCLIP_OPTION_TAGS:-}" ]; then
  curl_args+=( --data-urlencode "tags=$POPCLIP_OPTION_TAGS" )
fi
if [ -n "${POPCLIP_OPTION_TOKEN:-}" ]; then
  curl_args+=( -H "X-QuickNote-Token: $POPCLIP_OPTION_TOKEN" )
fi

code="$(printf '%s' "${POPCLIP_TEXT:-}" | /usr/bin/curl "${curl_args[@]}")" || code=""
case "$code" in
  200|201) exit 0 ;;
  *) echo "记入快记失败（HTTP ${code:-无法连接}）" >&2; exit 1 ;;
esac
