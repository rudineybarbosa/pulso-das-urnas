#!/usr/bin/env bash
# Instala ferramentas de linha de comando em ~/.local/bin, sem sudo.
set -euo pipefail

BIN="${HOME}/.local/bin"
mkdir -p "$BIN"
export PATH="${BIN}:${PATH}"

need() { command -v "$1" >/dev/null 2>&1; }

if ! need terraform; then
  echo "Instalando Terraform 1.9.8…"
  version="1.9.8"
  arch="$(uname -m)"
  case "$arch" in
    x86_64) arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) echo "Arquitetura não suportada: $arch"; exit 1 ;;
  esac
  tmp="$(mktemp -d)"
  curl -fsSL "https://releases.hashicorp.com/terraform/${version}/terraform_${version}_linux_${arch}.zip" -o "$tmp/tf.zip"
  unzip -q "$tmp/tf.zip" -d "$tmp"
  install -m 0755 "$tmp/terraform" "$BIN/terraform"
  rm -rf "$tmp"
fi

if ! need firebase; then
  echo "Instalando Firebase CLI…"
  curl -fsSL https://firebase.tools | bash
fi

echo "Ferramentas disponíveis:"
terraform -version | head -1
firebase --version 2>/dev/null || true
node --version
pnpm --version 2>/dev/null || echo "pnpm ausente: corepack enable && corepack prepare pnpm@9 --activate"
