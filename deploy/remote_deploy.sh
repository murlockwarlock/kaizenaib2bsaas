#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 6 ]]; then
    printf 'Usage: %s BUNDLE REVISION BUNDLE_SHA APP_DIR DOMAIN CERTBOT_EMAIL\n' "$0" >&2
    exit 2
fi

BUNDLE_PATH=$1
EXPECTED_REVISION=$2
EXPECTED_BUNDLE_SHA=$3
APP_DIR=$4
DOMAIN=$5
CERTBOT_EMAIL=$6

if [[ "$APP_DIR" != "/opt/kaizenai" ]]; then
    printf 'Unexpected application directory\n' >&2
    exit 2
fi

if [[ ! "$EXPECTED_REVISION" =~ ^[0-9a-f]{40}$ ]]; then
    printf 'Invalid revision\n' >&2
    exit 2
fi

if [[ ! "$EXPECTED_BUNDLE_SHA" =~ ^[0-9a-f]{64}$ ]]; then
    printf 'Invalid bundle checksum\n' >&2
    exit 2
fi

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
    printf 'Invalid domain\n' >&2
    exit 2
fi

if [[ ! "$CERTBOT_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    printf 'Invalid certificate email\n' >&2
    exit 2
fi

sudo -n true

STAGING_DIR=$(mktemp -d)
LOG_DIR="$APP_DIR/shared"
DEPLOY_LOG="$LOG_DIR/deploy-$EXPECTED_REVISION.log"
RELEASE_DIR="$APP_DIR/releases/$EXPECTED_REVISION"
CURRENT_LINK="$APP_DIR/current"
NEXT_LINK="$APP_DIR/.current-$EXPECTED_REVISION"
SHARED_DIR="$APP_DIR/shared"
BACKUP_DIR="$APP_DIR/backups"
WEATHER_UNIT="poly-weather-collector.service"
WEATHER_UNIT_PATH="/etc/systemd/system/$WEATHER_UNIT"
WEATHER_BACKUP="$BACKUP_DIR/weather/$WEATHER_UNIT.original"
WEATHER_STATUS="not_found"
NODE_VERSION="22.14.0"
NODE_ROOT="$APP_DIR/tools/node-v$NODE_VERSION-linux-x64"
NODE_BIN="$NODE_ROOT/bin/node"
NPM_BIN="$NODE_ROOT/bin/npm"
SWITCHED=0
PREVIOUS_RELEASE=""

cleanup() {
    rm -rf "$STAGING_DIR"
}

rollback() {
    local exit_code=$?
    trap - EXIT ERR
    set +e
    if [[ "$SWITCHED" == "1" && -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
        rm -f "$NEXT_LINK"
        ln -s "$PREVIOUS_RELEASE" "$NEXT_LINK"
        mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
        sudo systemctl restart kaizenai-backend.service
        sudo systemctl restart kaizenai-frontend.service
    fi
    cleanup
    printf 'Deployment failed for %s\n' "$EXPECTED_REVISION" >&2
    exit "$exit_code"
}

trap cleanup EXIT
trap rollback ERR

sudo install -d -o ubuntu -g ubuntu -m 0755 "$APP_DIR" "$APP_DIR/releases" "$SHARED_DIR" "$BACKUP_DIR"
touch "$DEPLOY_LOG"
chmod 0600 "$DEPLOY_LOG"

run_logged() {
    local label=$1
    shift
    if ! "$@" >>"$DEPLOY_LOG" 2>&1; then
        printf '%s failed\n' "$label" >&2
        tail -n 60 "$DEPLOY_LOG" >&2
        return 1
    fi
}

ensure_swap() {
    if sudo swapon --show=NAME --noheadings | grep -Fxq /swapfile; then
        return
    fi
    if [[ -e /swapfile ]]; then
        printf 'An existing inactive /swapfile was found\n' >&2
        return 1
    fi
    sudo fallocate -l 2G /swapfile
    sudo chmod 0600 /swapfile
    sudo mkswap /swapfile >>"$DEPLOY_LOG" 2>&1
    sudo swapon /swapfile
    if ! sudo grep -Fqx '/swapfile none swap sw 0 0' /etc/fstab; then
        printf '%s\n' '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >>"$DEPLOY_LOG"
    fi
}

if [[ ! -f "$BUNDLE_PATH" ]]; then
    printf 'Bundle is missing\n' >&2
    exit 1
fi

if [[ "$(sha256sum "$BUNDLE_PATH" | awk '{print $1}')" != "$EXPECTED_BUNDLE_SHA" ]]; then
    printf 'Bundle checksum mismatch\n' >&2
    exit 1
fi

tar -xzf "$BUNDLE_PATH" -C "$STAGING_DIR"
if [[ ! -f "$STAGING_DIR/REVISION" || "$(<"$STAGING_DIR/REVISION")" != "$EXPECTED_REVISION" ]]; then
    printf 'Bundle revision mismatch\n' >&2
    exit 1
fi

if [[ ! -f "$STAGING_DIR/DEPLOY_MANIFEST.sha256" ]]; then
    printf 'Bundle manifest is missing\n' >&2
    exit 1
fi

(cd "$STAGING_DIR" && sha256sum -c DEPLOY_MANIFEST.sha256 >/dev/null)
[[ -d "$STAGING_DIR/backend" && -d "$STAGING_DIR/frontend" ]]

if [[ -e "$RELEASE_DIR" ]]; then
    printf 'Release already exists: %s\n' "$EXPECTED_REVISION" >&2
    exit 1
fi

run_logged packages sudo apt-get update
run_logged packages sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates certbot curl nginx openssl python3 python3-pip python3-venv build-essential sqlite3 xz-utils
ensure_swap

if [[ ! -x "$NODE_BIN" || ! -x "$NPM_BIN" ]]; then
    NODE_ARCHIVE=$(mktemp)
    NODE_SUMS=$(mktemp)
    NODE_FILENAME="node-v$NODE_VERSION-linux-x64.tar.xz"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$NODE_FILENAME" -o "$NODE_ARCHIVE"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$NODE_SUMS"
    NODE_EXPECTED_SHA=$(awk -v filename="$NODE_FILENAME" '$2 == filename {print $1}' "$NODE_SUMS")
    NODE_ACTUAL_SHA=$(sha256sum "$NODE_ARCHIVE" | awk '{print $1}')
    [[ -n "$NODE_EXPECTED_SHA" && "$NODE_EXPECTED_SHA" == "$NODE_ACTUAL_SHA" ]]
    mkdir -p "$APP_DIR/tools"
    tar -xJf "$NODE_ARCHIVE" -C "$APP_DIR/tools"
    rm -f "$NODE_ARCHIVE" "$NODE_SUMS"
fi

[[ -x "$NODE_BIN" && -x "$NPM_BIN" ]]

cp -a "$STAGING_DIR" "$RELEASE_DIR"
rm -f "$RELEASE_DIR/DEPLOY_MANIFEST.sha256"

if [[ ! -f "$SHARED_DIR/backend.env" ]]; then
    umask 0077
    BACKEND_SECRET=$(openssl rand -hex 32)
    {
        printf 'PROJECT_NAME=KaizenAI\n'
        printf 'DATABASE_URL=sqlite:////opt/kaizenai/shared/mvp.db\n'
        printf 'SECRET_KEY=%s\n' "$BACKEND_SECRET"
        printf 'KIE_API_KEY=\n'
        printf 'KIE_API_URL=https://api.kie.ai\n'
        printf 'BASE_URL=https://%s\n' "$DOMAIN"
        printf 'CORS_ALLOW_ORIGINS=https://%s\n' "$DOMAIN"
        printf 'AI_GENERATION_ENABLED=false\n'
        printf 'BILLING_ENABLED=false\n'
        printf 'UPLOAD_DIR=/opt/kaizenai/shared/uploads\n'
    } >"$SHARED_DIR/backend.env"
fi

if [[ ! -f "$SHARED_DIR/frontend.env" ]]; then
    umask 0077
    {
        printf 'NODE_ENV=production\n'
        printf 'NEXT_PUBLIC_SITE_URL=https://%s\n' "$DOMAIN"
        printf 'NEXT_PUBLIC_API_URL=\n'
        printf 'BACKEND_INTERNAL_URL=http://127.0.0.1:8000\n'
    } >"$SHARED_DIR/frontend.env"
fi

grep -Fqx "BASE_URL=https://$DOMAIN" "$SHARED_DIR/backend.env"
grep -Fqx "CORS_ALLOW_ORIGINS=https://$DOMAIN" "$SHARED_DIR/backend.env"
grep -Eq '^SECRET_KEY=.{32,}$' "$SHARED_DIR/backend.env"
grep -Fqx "NEXT_PUBLIC_SITE_URL=https://$DOMAIN" "$SHARED_DIR/frontend.env"
chown ubuntu:ubuntu "$SHARED_DIR/backend.env" "$SHARED_DIR/frontend.env"
chmod 0600 "$SHARED_DIR/backend.env" "$SHARED_DIR/frontend.env"

if [[ -f "$SHARED_DIR/mvp.db" ]]; then
    DB_BACKUP_DIR="$BACKUP_DIR/database"
    install -d -o ubuntu -g ubuntu -m 0755 "$DB_BACKUP_DIR"
    DB_BACKUP="$DB_BACKUP_DIR/mvp.$(date -u +%Y%m%dT%H%M%SZ).db"
    cp -p "$SHARED_DIR/mvp.db" "$DB_BACKUP"
fi

ln -sfn "$SHARED_DIR/backend.env" "$RELEASE_DIR/backend/.env"
run_logged backend-venv python3 -m venv "$RELEASE_DIR/backend/.venv"
run_logged backend-dependencies "$RELEASE_DIR/backend/.venv/bin/pip" install --no-cache-dir -r "$RELEASE_DIR/backend/requirements.txt"
run_logged backend-migrations "$RELEASE_DIR/backend/.venv/bin/python" "$RELEASE_DIR/backend/scripts/migrate.py"
rm -f "$RELEASE_DIR/backend/.env"

ln -sfn "$SHARED_DIR/frontend.env" "$RELEASE_DIR/frontend/.env.production"
run_logged frontend-dependencies env PATH="$NODE_ROOT/bin:$PATH" "$NPM_BIN" --prefix "$RELEASE_DIR/frontend" ci --no-audit --no-fund
run_logged frontend-build env NODE_OPTIONS=--max-old-space-size=1536 PATH="$NODE_ROOT/bin:$PATH" "$NPM_BIN" --prefix "$RELEASE_DIR/frontend" run build
rm -f "$RELEASE_DIR/frontend/.env.production"

SYSTEMD_BACKUP_DIR="$BACKUP_DIR/systemd"
install -d -o ubuntu -g ubuntu -m 0755 "$SYSTEMD_BACKUP_DIR"
for unit in kaizenai-backend.service kaizenai-frontend.service; do
    unit_path="/etc/systemd/system/$unit"
    if [[ -f "$unit_path" ]]; then
        cp -p "$unit_path" "$SYSTEMD_BACKUP_DIR/$unit.$(date -u +%Y%m%dT%H%M%SZ)"
    fi
    sudo install -m 0644 "$RELEASE_DIR/deploy/systemd/$unit" "$unit_path"
done

NGINX_AVAILABLE="/etc/nginx/sites-available/kaizenai"
NGINX_ENABLED="/etc/nginx/sites-enabled/kaizenai"
NGINX_BACKUP_DIR="$BACKUP_DIR/nginx"
install -d -o ubuntu -g ubuntu -m 0755 "$NGINX_BACKUP_DIR"
if [[ -f "$NGINX_AVAILABLE" ]]; then
    cp -p "$NGINX_AVAILABLE" "$NGINX_BACKUP_DIR/kaizenai.$(date -u +%Y%m%dT%H%M%SZ).conf"
fi
if [[ -e "$NGINX_ENABLED" && ! -L "$NGINX_ENABLED" ]]; then
    printf 'Refusing to replace a regular nginx enabled file\n' >&2
    exit 1
fi
sed "s/__SITE_DOMAIN__/$DOMAIN/g" "$RELEASE_DIR/deploy/nginx-http.conf.template" >"$STAGING_DIR/kaizenai-http.conf"
sudo install -m 0644 "$STAGING_DIR/kaizenai-http.conf" "$NGINX_AVAILABLE"
if [[ ! -e "$NGINX_ENABLED" && ! -L "$NGINX_ENABLED" ]]; then
    sudo ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
fi
sudo install -d -m 0755 /var/www/certbot
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

PREVIOUS_RELEASE=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)
if [[ "$PREVIOUS_RELEASE" == "$CURRENT_LINK" || ! -d "$PREVIOUS_RELEASE" ]]; then
    PREVIOUS_RELEASE=""
fi
rm -f "$NEXT_LINK"
ln -s "$RELEASE_DIR" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
SWITCHED=1

sudo systemctl daemon-reload
sudo systemctl enable kaizenai-backend.service kaizenai-frontend.service
sudo systemctl restart kaizenai-backend.service
sudo systemctl restart kaizenai-frontend.service

for attempt in {1..30}; do
    if curl -fsS --max-time 5 http://127.0.0.1:8000/health 2>/dev/null | grep -Fq "\"$EXPECTED_REVISION\""; then
        break
    fi
    if [[ "$attempt" == "30" ]]; then
        sudo systemctl --no-pager --full status kaizenai-backend.service >&2 || true
        exit 1
    fi
    sleep 2
done

for attempt in {1..30}; do
    if curl -fsS --max-time 5 http://127.0.0.1:3000/api/health 2>/dev/null | grep -Fq "\"$EXPECTED_REVISION\""; then
        break
    fi
    if [[ "$attempt" == "30" ]]; then
        sudo systemctl --no-pager --full status kaizenai-frontend.service >&2 || true
        exit 1
    fi
    sleep 2
done

if [[ ! -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" || ! -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]]; then
    sudo certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" --keep-until-expiring >>"$DEPLOY_LOG" 2>&1
fi

[[ -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]]
sed "s/__SITE_DOMAIN__/$DOMAIN/g" "$RELEASE_DIR/deploy/nginx-https.conf.template" >"$STAGING_DIR/kaizenai-https.conf"
sudo install -m 0644 "$STAGING_DIR/kaizenai-https.conf" "$NGINX_AVAILABLE"
sudo nginx -t
sudo systemctl reload nginx

for attempt in {1..20}; do
    if curl -kfsS --resolve "$DOMAIN:443:127.0.0.1" --max-time 5 "https://$DOMAIN/api/health" 2>/dev/null | grep -Fq "\"$EXPECTED_REVISION\""; then
        break
    fi
    if [[ "$attempt" == "20" ]]; then
        sudo nginx -t >&2
        exit 1
    fi
    sleep 2
done

if [[ -e "$WEATHER_UNIT_PATH" || -L "$WEATHER_UNIT_PATH" ]]; then
    WEATHER_STATUS="masked"
    install -d -o ubuntu -g ubuntu -m 0755 "$BACKUP_DIR/weather"
    if [[ -L "$WEATHER_UNIT_PATH" && "$(readlink "$WEATHER_UNIT_PATH")" == "/dev/null" ]]; then
        sudo systemctl disable --now "$WEATHER_UNIT" >/dev/null 2>&1 || true
    else
        if [[ -e "$WEATHER_BACKUP" ]]; then
            printf 'Weather unit backup already exists while the unit is unmasked\n' >&2
            exit 1
        fi
        sudo systemctl disable --now "$WEATHER_UNIT" >/dev/null 2>&1 || true
        sudo mv "$WEATHER_UNIT_PATH" "$WEATHER_BACKUP"
        sudo systemctl mask "$WEATHER_UNIT"
    fi
    sudo systemctl daemon-reload
    [[ "$(readlink "$WEATHER_UNIT_PATH")" == "/dev/null" ]]
fi

printf 'revision=%s\n' "$EXPECTED_REVISION"
printf 'backend=active\n'
printf 'frontend=active\n'
printf 'nginx=active\n'
printf 'tls=active\n'
printf 'weather_collector=%s\n' "$WEATHER_STATUS"
