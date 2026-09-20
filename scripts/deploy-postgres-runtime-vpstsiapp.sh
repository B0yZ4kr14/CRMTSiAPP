#!/usr/bin/env bash
set -euo pipefail

archive=/root/.cache/crmtsiapp-postgres-runtime.tgz
app=/opt/tsi-stack/apps/crm/crmtsiapp
backup_root=/opt/tsi-stack/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$backup_root/crmtsiapp-before-postgres-runtime-$stamp"
log=/root/.cache/tsi-crm-deploy-postgres-runtime.log
exit_file=/root/.cache/tsi-crm-deploy-postgres-runtime.exit

run() {
  printf '%s\n' "$*" >>"$log"
  "$@" >>"$log" 2>&1
}

: >"$log"
printf '1' >"$exit_file"

if [[ ! -s "$archive" ]]; then
  printf '%s\n' 'Deployment archive is missing or empty.' >>"$log"
  exit 1
fi

mkdir -p "$backup"
run cp -a "$app/." "$backup/"
run cp -a /etc/systemd/system/crmtsiapp.service "$backup/crmtsiapp.service"
run cp -a /etc/crmtsiapp/crmtsiapp.env "$backup/crmtsiapp.env"
printf '%s\n' "$backup" > /root/.cache/tsi-crm-deploy-postgres-runtime.backup

run systemctl stop crmtsiapp
run find "$app" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
run tar xzf "$archive" -C "$app"
run chmod 0750 "$app/scripts/deploy-postgres-runtime-vpstsiapp.sh"
run /usr/bin/env bash -lc "set -a; . /etc/crmtsiapp/crmtsiapp.env; set +a; cd '$app' && /usr/bin/npm ci --omit=dev"
run /usr/bin/env bash -lc "set -a; . /etc/crmtsiapp/crmtsiapp.env; set +a; cd '$app' && /usr/bin/node migrate.js"

cat >/etc/systemd/system/crmtsiapp.service <<'UNIT'
[Unit]
Description=CRMTSiAPP PostgreSQL Runtime
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tsi-stack/apps/crm/crmtsiapp
EnvironmentFile=/etc/crmtsiapp/crmtsiapp.env
ExecStart=/usr/bin/node /opt/tsi-stack/apps/crm/crmtsiapp/server.js
Restart=always
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/run /var/lib/crmtsiapp

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/crmtsiapp-webhook-worker.service <<'UNIT'
[Unit]
Description=CRMTSiAPP durable webhook worker
After=network-online.target postgresql.service crmtsiapp.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tsi-stack/apps/crm/crmtsiapp
EnvironmentFile=/etc/crmtsiapp/crmtsiapp.env
ExecStart=/usr/bin/node /opt/tsi-stack/apps/crm/crmtsiapp/webhook-worker-main.js
Restart=always
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/run /var/lib/crmtsiapp

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/crmtsiapp-outbox-worker.service <<'UNIT'
[Unit]
Description=CRMTSiAPP PostgreSQL outbox worker
After=network-online.target postgresql.service crmtsiapp.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tsi-stack/apps/crm/crmtsiapp
EnvironmentFile=/etc/crmtsiapp/crmtsiapp.env
ExecStart=/usr/bin/node /opt/tsi-stack/apps/crm/crmtsiapp/outbox-worker-main.js
Restart=always
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/run /var/lib/crmtsiapp

[Install]
WantedBy=multi-user.target
UNIT

run systemctl daemon-reload
run systemctl enable crmtsiapp crmtsiapp-webhook-worker crmtsiapp-outbox-worker
run systemctl start crmtsiapp crmtsiapp-webhook-worker crmtsiapp-outbox-worker
printf '0' >"$exit_file"
