#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CONFIG_FILE="$ROOT_DIR/deploy/.env"

if [[ -f "$CONFIG_FILE" ]]; then
    set -a
    . "$CONFIG_FILE"
    set +a
else
    printf 'Missing deploy/.env. Copy deploy/.env.example and set the server values.\n' >&2
    exit 1
fi

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_PORT:?DEPLOY_PORT is required}"
: "${DEPLOY_KEY:?DEPLOY_KEY is required}"
: "${DEPLOY_DOMAIN:?DEPLOY_DOMAIN is required}"
: "${DEPLOY_CERTBOT_EMAIL:?DEPLOY_CERTBOT_EMAIL is required}"
: "${DEPLOY_APP_DIR:?DEPLOY_APP_DIR is required}"

if [[ ! -r "$DEPLOY_KEY" ]]; then
    printf 'SSH key is not readable: %s\n' "$DEPLOY_KEY" >&2
    exit 1
fi

if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
    printf 'Working tree must be clean before deploy\n' >&2
    exit 1
fi

REVISION=$(git -C "$ROOT_DIR" rev-parse --verify HEAD)
TEMP_DIR=$(mktemp -d)
REMOTE_BUNDLE="/tmp/kaizenai-$REVISION.tar.gz"
REMOTE_SCRIPT="/tmp/kaizenai-deploy-$REVISION.sh"

cleanup() {
    rm -rf "$TEMP_DIR"
    ssh -i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" rm -f "$REMOTE_BUNDLE" "$REMOTE_SCRIPT" >/dev/null 2>&1 || true
}

trap cleanup EXIT

git -C "$ROOT_DIR" archive --format=tar "$REVISION" -o "$TEMP_DIR/source.tar"
mkdir "$TEMP_DIR/tree"
tar -xf "$TEMP_DIR/source.tar" -C "$TEMP_DIR/tree"
printf '%s\n' "$REVISION" >"$TEMP_DIR/tree/REVISION"
(cd "$TEMP_DIR/tree" && find . -type f ! -name DEPLOY_MANIFEST.sha256 -print0 | sort -z | xargs -0 shasum -a 256 >DEPLOY_MANIFEST.sha256)
tar -C "$TEMP_DIR/tree" -czf "$TEMP_DIR/bundle.tar.gz" .
BUNDLE_SHA=$(shasum -a 256 "$TEMP_DIR/bundle.tar.gz" | awk '{print $1}')

SSH_OPTIONS=(-i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p "$DEPLOY_PORT")
SCP_OPTIONS=(-i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P "$DEPLOY_PORT")

scp "${SCP_OPTIONS[@]}" "$ROOT_DIR/deploy/remote_deploy.sh" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_SCRIPT"
scp "${SCP_OPTIONS[@]}" "$TEMP_DIR/bundle.tar.gz" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_BUNDLE"
ssh "${SSH_OPTIONS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" bash "$REMOTE_SCRIPT" "$REMOTE_BUNDLE" "$REVISION" "$BUNDLE_SHA" "$DEPLOY_APP_DIR" "$DEPLOY_DOMAIN" "$DEPLOY_CERTBOT_EMAIL"
