#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ENV_FILE=/etc/crmtsiapp/crmtsiapp.env
BACKUP_DIR=/var/backups/crmtsiapp
RETENTION_DAYS=14
[ -r "$ENV_FILE" ] || { echo "CRMTSiAPP environment unavailable" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a
: "${DATABASE_URL:?DATABASE_URL unavailable}"
# Expired bearer-token hashes have no business value and are removed before backup.
/usr/bin/psql --dbname="$DATABASE_URL" --set=ON_ERROR_STOP=1 --command="delete from sessions where expires_at <= now()" >/dev/null
install -d -o root -g root -m 700 "$BACKUP_DIR"
ts=$(date -u +%Y%m%dT%H%M%SZ)
tmp="$BACKUP_DIR/.crmtsiapp-$ts.dump.tmp"
dest="$BACKUP_DIR/crmtsiapp-$ts.dump"
trap 'rm -f "$tmp"' EXIT
/usr/bin/pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$tmp"
/usr/bin/pg_restore --list "$tmp" >/dev/null
mv -f "$tmp" "$dest"
find "$BACKUP_DIR" -xdev -type f -name 'crmtsiapp-*.dump' -mtime +"$RETENTION_DAYS" -delete
printf 'CRMTSIAPP_BACKUP_OK %s\n' "$(basename "$dest")"
