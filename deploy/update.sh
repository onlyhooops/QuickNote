#!/usr/bin/env bash
# =============================================================================
# 快记 QuickNote —— 智能更新脚本（在已部署实例上执行）
# 用法：sudo bash deploy/update.sh [--yes] [--force]
#   --yes   免确认直接执行    --force 本地有未提交改动/本地领先远端时强制覆盖更新
#
# 主流程：检测运行与版本 → 拉取远端 → 比对差异 → 停止服务 → 更新源码 → 部署重启
# 与 install.sh 的关系：install.sh=首次全量部署；本脚本=增量更新（不停用既有数据/用户/unit）。
# =============================================================================
set -euo pipefail

# ---------- 参数与路径 ----------
YES=0; FORCE=0
for a in "$@"; do
  case "$a" in
    --yes) YES=1 ;;
    --force) FORCE=1 ;;
    *) echo "未知参数：$a（支持 --yes / --force）" >&2; exit 1 ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then echo "✗ 请用 root 运行：sudo bash $0" >&2; exit 1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${QUICKNOTE_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SERVICE="${QUICKNOTE_SERVICE:-quicknote}"
BRANCH="${QUICKNOTE_BRANCH:-main}"

echo "==> QuickNote 智能更新"
echo "    项目目录：$PROJECT_ROOT   服务：$SERVICE   分支：$BRANCH"

# ---------- 0. 前置检查：仓库 / 远端 / systemd unit ----------
cd "$PROJECT_ROOT"
[ -d .git ] || { echo "✗ 不是 git 仓库（$PROJECT_ROOT）——请先部署源码" >&2; exit 1; }
git remote get-url origin >/dev/null 2>&1 || { echo "✗ 未配置 origin 远端" >&2; exit 1; }
systemctl cat "$SERVICE" >/dev/null 2>&1 || { echo "✗ 未检测到 systemd 服务 $SERVICE——请先运行 deploy/install.sh 完成首次部署" >&2; exit 1; }

# ---------- 1. 检测“运行 + 版本” ----------
SVC_STATE="$(systemctl is-active "$SERVICE" 2>/dev/null || echo inactive)"
LOCAL_HEAD="$(git rev-parse HEAD)"
LOCAL_SHORT="$(git log -1 --pretty='%h %s' "$LOCAL_HEAD")"
echo "    服务状态：$SVC_STATE"
echo "    本地版本：$LOCAL_SHORT"

# ---------- 2. 拉取远端并比对 ----------
echo "==> [1/6] 拉取远端 origin/$BRANCH ..."
git fetch origin "$BRANCH"
REMOTE_HEAD="$(git rev-parse "origin/$BRANCH")"
REMOTE_SHORT="$(git log -1 --pretty='%h %s' "origin/$BRANCH")"
echo "    远端版本：$REMOTE_SHORT"

BEHIND="$(git rev-list --count "$LOCAL_HEAD..origin/$BRANCH")"
AHEAD="$(git rev-list --count "origin/$BRANCH..$LOCAL_HEAD")"
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then DIRTY=1; else DIRTY=0; fi
echo "    差异：落后 $BEHIND 个提交 / 领先 $AHEAD 个提交 / 未提交改动 $([ "$DIRTY" -eq 1 ] && echo 有 || echo 无)"

# ---------- 3. 差异判断 ----------
if [ "$BEHIND" -eq 0 ] && [ "$AHEAD" -eq 0 ] && [ "$DIRTY" -eq 0 ]; then
  echo "✔ 已是最新（本地与远端一致，无未提交改动），无需更新。"
  exit 0
fi
if [ "$BEHIND" -eq 0 ]; then
  [ "$FORCE" -eq 1 ] || { echo "✗ 本地已含远端全部提交（无更新可拉）。若有差异请检查后手动处理。" >&2; exit 1; }
fi
if [ "$AHEAD" -gt 0 ] && [ "$FORCE" -eq 0 ]; then
  echo "✗ 本地领先远端 $AHEAD 个提交——请先推送到远端，或用 --force 强制覆盖（会丢弃这些提交）。" >&2
  exit 1
fi
if [ "$DIRTY" -eq 1 ] && [ "$FORCE" -eq 0 ]; then
  echo "✗ 存在未提交改动——请先 commit/stash，或用 --force 强制覆盖（会丢弃改动）。" >&2
  exit 1
fi

echo "    将更新内容："
git log --oneline "$LOCAL_HEAD..origin/$BRANCH" | sed 's/^/      /'
if [ "$YES" -eq 0 ]; then
  read -r -p "    确认执行更新？[y/N] " ans
  case "$ans" in y|Y) ;; *) echo "已取消"; exit 0 ;; esac
fi

# ---------- 4. 停止本地服务 ----------
echo "==> [2/6] 停止服务 $SERVICE ..."
if [ "$SVC_STATE" = active ]; then systemctl stop "$SERVICE"; fi
systemctl is-active "$SERVICE" >/dev/null 2>&1 && echo "✗ 服务未停止" >&2 && exit 1 || echo "    已停止"

# ---------- 5. 更新源码（fast-forward） ----------
echo "==> [3/6] 更新源码（git merge --ff-only origin/$BRANCH）..."
OLD_HEAD="$LOCAL_HEAD"
git merge --ff-only "origin/$BRANCH"
NEW_HEAD="$(git rev-parse HEAD)"
echo "    新版本：$(git log -1 --pretty='%h %s' "$NEW_HEAD")"

# ---------- 6. 按需重装依赖 / 构建 ----------
NEED_INSTALL=0; NEED_BUILD=0
if [ -n "$(git diff --name-only "$OLD_HEAD" "$NEW_HEAD" | grep -E '^(package\.json|package-lock\.json|server/package\.json|web/package\.json)$' || true)" ]; then NEED_INSTALL=1; fi
if [ -n "$(git diff --name-only "$OLD_HEAD" "$NEW_HEAD" | grep -E '^(web/|server/)' || true)" ]; then NEED_BUILD=1; fi

# 优先用便携 Node（install.sh 提供）；否则回退系统 Node 并校验 >=23.4
export PATH="$PROJECT_ROOT/.node/bin:$PATH"
if [ -x "$PROJECT_ROOT/.node/bin/node" ]; then
  NODE_BIN="$PROJECT_ROOT/.node/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  echo "✗ 未找到 Node——请先运行 deploy/install.sh 完成首次部署（自带 Node）" >&2; exit 1
fi
if ! "$NODE_BIN" -p 'process.versions.node' 2>/dev/null | awk -F. '$1>23 || ($1==23 && $2>=4)' | grep -q .; then
  echo "✗ 当前 Node（$("$NODE_BIN" -p process.versions.node)）过旧（需 >=23.4）；请先运行 deploy/install.sh 重新部署" >&2
  exit 1
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  echo "==> [4/6] 依赖有变更，执行 npm install ..."
  npm install
else
  echo "==> [4/6] 依赖无变更，跳过 npm install"
fi
if [ "$NEED_BUILD" -eq 1 ]; then
  echo "==> [5/6] 源码有变更，执行 npm run build ..."
  npm run build
else
  echo "==> [5/6] 源码无变更，跳过构建（dist 已是最新）"
fi

# ---------- 7. 部署 / 重启 + 健康检查 ----------
echo "==> [6/6] 重新启动服务 $SERVICE ..."
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1 || true
systemctl start "$SERVICE"

PORT="$(systemctl show "$SERVICE" -p Environment --value 2>/dev/null | tr ' ' '\n' | grep '^QUICKNOTE_PORT=' | cut -d= -f2 || echo 3987)"
PORT="${PORT:-3987}"
OK=0
for i in $(seq 1 20); do
  if curl -s --noproxy '*' -o /dev/null "http://127.0.0.1:${PORT}/api/health" 2>/dev/null; then OK=1; break; fi
  sleep 0.5
done
[ "$OK" -eq 1 ] || { echo "✗ 服务启动后健康检查未通过，请看：journalctl -u $SERVICE -n 50" >&2; exit 1; }

echo
echo "✔ 更新完成！"
echo "   版本：$(git log -1 --pretty='%h %s' "$NEW_HEAD")"
echo "   服务：$SERVICE（$(systemctl is-active "$SERVICE")）"
echo "   日志：journalctl -u $SERVICE -f"
