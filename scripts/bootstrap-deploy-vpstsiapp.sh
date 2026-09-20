#!/usr/bin/env bash
set -euo pipefail

archive=/root/.cache/crmtsiapp-postgres-runtime.tgz
app=/opt/tsi-stack/apps/crm/crmtsiapp
backup_root=/opt/tsi-stack/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$backup_root/crmtsiapp-before-reconcile-$stamp"
log=/root/.cache/tsi-crm-reconcile.log
exit_file=/root/.cache/tsi-crm-reconcile.exit

: >"$log"
printf '1' >"$exit_file"
exec >>"$log" 2>&1

if [[ ! -s "$archive" ]]; then
  echo 'archive is missing or empty'
  exit 1
fi

mkdir -p "$backup"
cp -a "$app/." "$backup/"
cp -a /etc/systemd/system/crmtsiapp.service "$backup/crmtsiapp.service"
cp -a /etc/crmtsiapp/crmtsiapp.env "$backup/crmtsiapp.env"
printf '%s\n' "$backup" >/root/.cache/tsi-crm-reconcile.backup

systemctl stop crmtsiapp
find "$app" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar xzf "$archive" -C "$app"
exec /bin/bash "$app/scripts/deploy-postgres-runtime-vpstsiapp.sh"
