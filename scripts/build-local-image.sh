#!/bin/sh
# Build the manager on this machine, then package it as tsdd-manager:local.
# Usage: scripts/build-local-image.sh [image-tag]
set -eu
cd "$(dirname "$0")/.."
TAG="${1:-tsdd-manager:local}"
ENGINE="$(command -v podman || command -v docker)"
pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com
pnpm build
"$ENGINE" build -t "$TAG" -f Dockerfile.prebuilt .
echo "built $TAG"
