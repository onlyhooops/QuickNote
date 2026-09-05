#!/usr/bin/env bash
# =============================================================================
# 快记 QuickNote —— Linux 通用一键部署脚本（自动识别发行版/包管理器）
# 用法：sudo bash deploy/install.sh
#
# 适配：Debian/Ubuntu(apt)、Fedora/RHEL/CentOS(dnf|yum)、Arch(pacman)、
#       Alpine(apk)、openSUSE(zypper)，以及 macOS(brew，仅本机自用)。
# 特性：自带现代 Node(>=23.4，内置 node:sqlite)，避免发行版 Node 过旧；
#       所有路径可用环境变量自定义（见下方“可配置项”）。
# =============================================================================
set -euo pipefail

# ---------- 可配置项（均可用环境变量覆盖） ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${QUICKNOTE_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PORT="${QUICKNOTE_PORT:-3987}"
HOST="${QUICKNOTE_HOST:-127.0.0.1}"
DATA_DIR="${QUICKNOTE_DATA:-/var/lib/quicknote}"
IMAGES_DIR="${QUICKNOTE_IMAGES_DIR:-$DATA_DIR/images}"
ATTACHMENTS_DIR="${QUICKNOTE_ATTACHMENTS_DIR:-$DATA_DIR/attachments}"
BACKUP_DIR="${QUICKNOTE_BACKUP_DIR:-$DATA_DIR/backups}"
RUN_USER="${QUICKNOTE_USER:-quicknote}"
NODE_VERSION="${QUICKNOTE_NODE_VERSION:-v24.4.0}"
NODE_DIR="${QUICKNOTE_NODE_DIR:-$PROJECT_ROOT/.node}"

echo "==> QuickNote 部署"
echo "    项目目录 : $PROJECT_ROOT"
echo "    监听     : $HOST:$PORT"
echo "    数据目录 : $DATA_DIR"
echo "    图片目录 : $IMAGES_DIR"
echo "    附件目录 : $ATTACHMENTS_DIR"
echo "    备份目录 : $BACKUP_DIR"

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ 请用 root 运行：sudo bash $0" >&2
  exit 1
fi

# ---------- 0. 识别包管理器 ----------
PM=""
detect_pm() {
  if command -v apt-get >/dev/null 2>&1; then PM=apt
  elif command -v dnf >/dev/null 2>&1; then PM=dnf
  elif command -v yum >/dev/null 2>&1; then PM=yum
  elif command -v apk >/dev/null 2>&1; then PM=apk
  elif command -v pacman >/dev/null 2>&1; then PM=pacman
  elif command -v zypper >/dev/null 2>&1; then PM=zypper
  elif command -v brew >/dev/null 2>&1; then PM=brew
  else PM=unknown; fi
}
detect_pm
echo "==> [1/6] 检测包管理器：${PM:-unknown}"

# ---------- 1. 安装系统基础依赖（curl/tar/xz/ca-certificates，供下载解压 Node）----------
echo "==> [1/6] 安装系统依赖..."
case "$PM" in
  apt)    apt-get update -qq && apt-get install -y -qq curl ca-certificates tar xz-utils ;;
  dnf|yum) $PM install -y curl ca-certificates tar xz-utils ;;
  apk)    apk add --no-cache curl ca-certificates tar xz ;;
  pacman) pacman -Sy --needed --noconfirm curl ca-certificates tar xz ;;
  zypper) zypper -n install curl ca-certificates tar xz-utils ;;
  brew)   brew install curl ca-certificates gnu-tar xz >/dev/null 2>&1 || true ;;
  *)      echo "警告：未识别包管理器，请确保已安装 curl / tar / xz / ca-certificates" ;;
esac

# ---------- 2. 准备 Node（>=23.4，含 node:sqlite）----------
echo "==> [2/6] 准备 Node..."
node_ok() { "$1" -p 'process.versions.node' 2>/dev/null | awk -F. '$1>23 || ($1==23 && $2>=4)' | grep -q .; }

NODE_BIN=""
if node_ok "$(command -v node 2>/dev/null)" 2>/dev/null; then
  NODE_BIN="$(command -v node)"
  echo "    使用系统 Node $(node -p process.versions.node)"
elif [ -x "$NODE_DIR/bin/node" ] && node_ok "$NODE_DIR/bin/node"; then
  NODE_BIN="$NODE_DIR/bin/node"
  echo "    使用项目内 Node $("$NODE_BIN" -p process.versions.node)"
else
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) NODE_ARCH=x64 ;;
    aarch64|arm64) NODE_ARCH=arm64 ;;
    armv7l) NODE_ARCH=armv7l ;;
    *) echo "✗ 不支持的架构：$ARCH" >&2; exit 1 ;;
  esac
  echo "    下载 Node ${NODE_VERSION} (linux-${NODE_ARCH})..."
  mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -o /tmp/quicknote-node.tar.xz
  tar -xJf /tmp/quicknote-node.tar.xz -C "$NODE_DIR" --strip-components=1
  rm -f /tmp/quicknote-node.tar.xz
  NODE_BIN="$NODE_DIR/bin/node"
  echo "    下载完成 Node $("$NODE_BIN" -p process.versions.node)"
fi
# 将其所在目录前置到 PATH，使 node/npm 均可直接调用
export PATH="$(dirname "$NODE_BIN"):$PATH"

# ---------- 3. 安装依赖并构建 ----------
echo "==> [3/6] 安装依赖并构建（npm install / npm run build）..."
cd "$PROJECT_ROOT"
npm install
npm run build

# ---------- 4. 创建运行用户与各数据目录 ----------
echo "==> [4/6] 创建运行用户与数据目录..."
id -u "$RUN_USER" >/dev/null 2>&1 || useradd -r -m -d "$DATA_DIR" -s /usr/sbin/nologin "$RUN_USER"
mkdir -p "$DATA_DIR" "$IMAGES_DIR" "$ATTACHMENTS_DIR" "$BACKUP_DIR"
chown -R "$RUN_USER":"$RUN_USER" "$DATA_DIR"
chmod -R a+rX "$PROJECT_ROOT"

# ---------- 5. 安装并启用 systemd 服务 ----------
echo "==> [5/6] 安装并启用 systemd 服务..."
cat > /etc/systemd/system/quicknote.service <<UNIT
[Unit]
Description=QuickNote - local web note-taking app
After=network.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_USER
WorkingDirectory=$PROJECT_ROOT
ExecStart=$NODE_BIN $PROJECT_ROOT/server/src/index.js
Restart=always
RestartSec=3
Environment=QUICKNOTE_HOST=$HOST
Environment=QUICKNOTE_PORT=$PORT
Environment=QUICKNOTE_DATA=$DATA_DIR
Environment=QUICKNOTE_IMAGES_DIR=$IMAGES_DIR
Environment=QUICKNOTE_ATTACHMENTS_DIR=$ATTACHMENTS_DIR
Environment=QUICKNOTE_BACKUP_DIR=$BACKUP_DIR

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now quicknote
sleep 1

# ---------- 6. 完成 ----------
echo "==> [6/6] 完成"
echo
echo "✔ 部署完成！访问：http://$HOST:$PORT"
echo "  日志：journalctl -u quicknote -f"
echo "  数据：$DATA_DIR（图片 $IMAGES_DIR / 附件 $ATTACHMENTS_DIR / 备份 $BACKUP_DIR）"
echo "  手机/局域网：将 process 的 QUICKNOTE_HOST 改为 0.0.0.0 并 systemctl restart quicknote"
