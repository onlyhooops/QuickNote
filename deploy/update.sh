#!/usr/bin/env bash
# =============================================================================
# 快记 QuickNote —— 智能更新脚本（在已部署实例上执行）
# 用法：sudo bash deploy/update.sh [--yes] [--force]
#   --yes   免确认直接执行    --force 本地有未提交改动/本地领先远端时强制覆盖更新
# 主流程：检测运行与版本 → 拉取远端 → 比对差异 → 停止服务 → 更新源码 → 部署重启
# 增强：若“代码已最新但服务进程早于代码（进程仍为旧版）”，也会自动重启以应用。
# =============================================================================
set -euo pipefail

YES=0; FORCE=0
for a in "$@"; do
  case "$a" in
    --yes) YES=1 ;;
    --force) FORCE=1 ;;
    *) echo "未知参数：$a（支持 --yes / --force）" >&2; exit 1 ;;
  esac
done

[ "$(id -u)" -eq 0 ] || { echo "✗ 请用 root 运行：sudo bash $0" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${QUICKNOTE_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SERVICE="${QUICKNOTE_SERVICE:-quicknote}"
BRANCH="${QUICKNOTE_BRANCH:-main}"

echo "==> QuickNote 智能更新"
echo "    项目目录：$PROJECT_ROOT   服务：$SERVICE   分支：$BRANCH"

cd "$PROJECT_ROOT"
[ -d .git ] || { echo "✗ 不是 git 仓库（$PROJECT_ROOT）" >&2; exit 1; }
git remote get-url origin >/dev/null 2>&1 || { echo "✗ 未配置 origin 远端" >&2; exit 1; }
systemctl cat "$SERVICE" >/dev/null 2>&1 || { echo "✗ 未检测到 systemd 服务 $SERVICE——请先运行 deploy/install.sh" >&2; exit 1; }

# 服务启动时间是否早于当前代码（进程为旧版）
service_stale() {
  local start newest s_ep n_ep
  start="$(systemctl show -p ActiveEnterTimestamp --value "$SERVICE" 2>/dev/null || true)"
  [ -n "$start" ] || return 1
  newest="$(find "$PROJECT_ROOT/server" "$PROJECT_ROOT/web/src" "$PROJECT_ROOT/web/public" -type f -printf '%T@\n' 2>/dev/null | sort -nr | head -1 || true)"
  [ -n "$newest" ] || return 1
  s_ep="$(date -d "$start" +%s 2>/dev/null || echo 0)"
  n_ep="${newest%.*}"
  [ "${n_ep:-0}" -gt "${s_ep:-0}" ]
}

# 重启 + 健康检查
restart_service() {
  echo "==> 重启服务 $SERVICE ..."
  systemctl daemon-reload
  systemctl enable "$SERVICE" >/dev/null 2>&1 || true
  systemctl restart "$SERVICE"
  PORT="$(systemctl show "$SERVICE" -p Environment --value 2>/dev/null | tr ' ' '\n' | grep '^QUICKNOTE_PORT=' | cut -d= -f2 || true)"
  PORT="${PORT:-3987}"
  OK=0
  for i in $(seq 1 20); do
    curl -s --noproxy '*' -o /dev/null "http://127.0.0.1:${PORT}/api/health" 2>/dev/null && { OK=1; break; }
    sleep 0.5
  done
  [ "$OK" -eq 1 ] || { echo "✗ 健康检查未通过：journalctl -u $SERVICE -n 50" >&2; exit 1; }
  echo "✔ 已重启并通过健康检查（http://127.0.0.1:${PORT}/api/health）"
}

# 前端源码/入口是否比构建产物 web/dist 新（dist 缺失或落后 → 需要重新构建）
web_build_needed() {
  [ -d "$PROJECT_ROOT/web/dist" ] || return 0
  local newest_src newest_dist
  newest_src="$( { find "$PROJECT_ROOT/web/src" "$PROJECT_ROOT/web/public" -type f -printf '%T@\n' 2>/dev/null; \
    stat -c '%Y' "$PROJECT_ROOT/web/index.html" "$PROJECT_ROOT/web/vite.config.js" 2>/dev/null; } | sort -nr | head -1 || true)"
  newest_dist="$(find "$PROJECT_ROOT/web/dist" -type f -printf '%T@\n' 2>/dev/null | sort -nr | head -1 || true)"
  [ -n "$newest_src" ] || return 1
  [ -n "$newest_dist" ] || return 0
  # 源码比产物新 1 秒以上即认为需要构建（避免同秒写入误判）
  awk -v s="$newest_src" -v d="$newest_dist" 'BEGIN{ exit !(s > d + 1) }'
}

# 依赖清单是否比 node_modules 新（需要 npm ci）
deps_changed_since_build() {
  [ -d "$PROJECT_ROOT/node_modules" ] || return 0
  local lock newest
  lock="$PROJECT_ROOT/node_modules/.package-lock.json"
  [ -f "$lock" ] || return 0
  newest="$( { stat -c '%Y' "$PROJECT_ROOT/package.json" "$PROJECT_ROOT/package-lock.json" \
    "$PROJECT_ROOT/server/package.json" "$PROJECT_ROOT/web/package.json" 2>/dev/null; } | sort -nr | head -1 || true)"
  [ -n "$newest" ] || return 1
  awk -v n="$newest" -v l="$(stat -c '%Y' "$lock")" 'BEGIN{ exit !(n > l + 1) }'
}

# 准备 Node 工具链，并按 NEED_INSTALL / NEED_BUILD 执行安装与构建
run_install_build() {
  export PATH="$PROJECT_ROOT/.node/bin:$PATH"
  local NODE_BIN
  if [ -x "$PROJECT_ROOT/.node/bin/node" ]; then
    NODE_BIN="$PROJECT_ROOT/.node/bin/node"
  elif command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  else
    echo "✗ 未找到 Node——请先运行 deploy/install.sh" >&2; exit 1
  fi
  if ! "$NODE_BIN" -p 'process.versions.node' 2>/dev/null | awk -F. '$1>23 || ($1==23 && $2>=4)' | grep -q .; then
    echo "✗ Node 过旧（$("$NODE_BIN" -p process.versions.node)）需 >=23.4；请先运行 deploy/install.sh" >&2; exit 1
  fi
  if [ "$NEED_INSTALL" -eq 1 ]; then
    echo "==> 依赖有变更，npm ci（严格按 package-lock.json 安装，不改写锁文件）..."
    npm ci
  else
    echo "==> 依赖无变更，跳过 npm ci"
  fi
  if [ "$NEED_BUILD" -eq 1 ]; then
    echo "==> 前端产物落后于源码，npm run build ..."
    npm run build
  else
    echo "==> 前端产物已是最新，无需构建"
  fi
}

confirm() {
  [ "$YES" -eq 1 ] || {
    read -r -p "    $1 [y/N] " ans
    case "$ans" in y|Y) ;; *) echo "已取消"; exit 0 ;; esac
  }
}

# ---------- 1. 运行与版本 ----------
SVC_STATE="$(systemctl is-active "$SERVICE" 2>/dev/null || echo inactive)"
LOCAL_HEAD="$(git rev-parse HEAD)"
echo "    服务状态：$SVC_STATE"
echo "    本地版本：$(git log -1 --pretty='%h %s' "$LOCAL_HEAD")"

# ---------- 2. 拉取远端并比对 ----------
echo "==> [1/6] 拉取远端 origin/$BRANCH ..."
git fetch origin "$BRANCH"
REMOTE_HEAD="$(git rev-parse "origin/$BRANCH")"
echo "    远端版本：$(git log -1 --pretty='%h %s' "origin/$BRANCH")"

BEHIND="$(git rev-list --count "$LOCAL_HEAD..origin/$BRANCH")"
AHEAD="$(git rev-list --count "origin/$BRANCH..$LOCAL_HEAD")"
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then DIRTY=1; else DIRTY=0; fi
echo "    差异：落后 $BEHIND / 领先 $AHEAD / 未提交 $([ "$DIRTY" -eq 1 ] && echo 有 || echo 无)"

# ---------- 3. 已是最新？ ----------
if [ "$BEHIND" -eq 0 ] && [ "$AHEAD" -eq 0 ] && [ "$DIRTY" -eq 0 ]; then
  NEED_INSTALL=0; NEED_BUILD=0
  if deps_changed_since_build; then NEED_INSTALL=1; fi
  if web_build_needed; then NEED_BUILD=1; fi
  if [ "$NEED_INSTALL" -eq 0 ] && [ "$NEED_BUILD" -eq 0 ] && ! service_stale; then
    echo "✔ 已是最新（本地与远端一致，进程与代码一致），无需更新。"
    exit 0
  fi
  # 修复盲区：先 git pull、后跑本脚本时“代码已最新”，但 web/dist 与依赖常仍落后于源码——
  # 此时仅重启不够，需按时间戳比对重新安装/构建后再重启。
  if [ "$NEED_BUILD" -eq 1 ] || [ "$NEED_INSTALL" -eq 1 ]; then
    echo "✔ 代码已是最新，但检测到需要安装/构建的变更（前端产物落后于源码）——构建后重启以应用。"
    confirm "确认安装依赖并重新构建前端，然后重启服务 $SERVICE？"
  else
    echo "✔ 代码已是最新，但服务进程早于当前代码（进程仍为旧版）——重启以应用。"
    confirm "确认重启服务 $SERVICE 以应用当前代码？"
  fi
  run_install_build
  restart_service
  echo "   当前代码：$(git log -1 --pretty='%h %s' HEAD)"
  exit 0
fi

if [ "$AHEAD" -gt 0 ] && [ "$FORCE" -eq 0 ]; then
  echo "✗ 本地领先远端 $AHEAD 个提交——请先推送，或用 --force（会丢弃）" >&2; exit 1
fi
if [ "$DIRTY" -eq 1 ] && [ "$FORCE" -eq 0 ]; then
  echo "✗ 存在未提交改动——请先 commit/stash，或用 --force（会丢弃）" >&2; exit 1
fi

echo "    将更新内容："
git log --oneline "$LOCAL_HEAD..origin/$BRANCH" | sed 's/^/      /'
confirm "确认执行更新？"

# ---------- 4. 停服 ----------
echo "==> [2/6] 停止服务 $SERVICE ..."
if [ "$SVC_STATE" = active ]; then systemctl stop "$SERVICE"; fi
systemctl is-active "$SERVICE" >/dev/null 2>&1 && { echo "✗ 服务未停止" >&2; exit 1; } || echo "    已停止"

# ---------- 5. 更新源码 ----------
echo "==> [3/6] 更新源码（git merge --ff-only origin/$BRANCH）..."
OLD_HEAD="$LOCAL_HEAD"
git merge --ff-only "origin/$BRANCH"
NEW_HEAD="$(git rev-parse HEAD)"
echo "    新版本：$(git log -1 --pretty='%h %s' "$NEW_HEAD")"

# ---------- 6. 按需重装依赖 / 构建 ----------
NEED_INSTALL=0; NEED_BUILD=0
if [ -n "$(git diff --name-only "$OLD_HEAD" "$NEW_HEAD" | grep -E '^(package\.json|package-lock\.json|server/package\.json|web/package\.json)$' || true)" ]; then NEED_INSTALL=1; fi
if [ -n "$(git diff --name-only "$OLD_HEAD" "$NEW_HEAD" | grep -E '^(web/|server/)' || true)" ]; then NEED_BUILD=1; fi

export PATH="$PROJECT_ROOT/.node/bin:$PATH"
if [ -x "$PROJECT_ROOT/.node/bin/node" ]; then
  NODE_BIN="$PROJECT_ROOT/.node/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  echo "✗ 未找到 Node——请先运行 deploy/install.sh" >&2; exit 1
fi
if ! "$NODE_BIN" -p 'process.versions.node' 2>/dev/null | awk -F. '$1>23 || ($1==23 && $2>=4)' | grep -q .; then
  echo "✗ Node 过旧（$("$NODE_BIN" -p process.versions.node)）需 >=23.4；请先运行 deploy/install.sh" >&2; exit 1
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  echo "==> [4/6] 依赖有变更，npm ci（严格按 package-lock.json 安装，不改写锁文件）..."; npm ci
else
  echo "==> [4/6] 依赖无变更，跳过 npm ci"
fi
if [ "$NEED_BUILD" -eq 1 ]; then
  echo "==> [5/6] 源码有变更，npm run build ..."; npm run build
else
  echo "==> [5/6] 源码无变更，跳过构建"
fi

# ---------- 7. 部署 / 重启 ----------
echo "==> [6/6] 部署..."
restart_service
echo "   版本：$(git log -1 --pretty='%h %s' HEAD)"
