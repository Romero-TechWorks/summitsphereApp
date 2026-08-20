#!/usr/bin/env bash
# ============================================================================
# Respaldo cifrado de la base de SummitApp.
#
# pg_dump  →  GPG (AES256)  →  bucket S3/R2  →  rotación por antigüedad.
#
# Lo corre `.github/workflows/backup.yml` todas las noches, pero también sirve
# a mano desde cualquier máquina que tenga psql 17, gpg y aws-cli:
#
#   export SUPABASE_DB_URL='postgresql://...:5432/postgres'
#   export BACKUP_GPG_PASSPHRASE='...'
#   export BACKUP_S3_DEST='s3://summit-respaldos/postgres'
#   export BACKUP_S3_ENDPOINT='https://<cuenta>.r2.cloudflarestorage.com'
#   ./scripts/backup.sh
#
# ⚠️ ESTE ARCHIVO CONTIENE DATOS PERSONALES DE LOS CLIENTES DE LA FIRMA.
#    Nombres, CURP en constancias DC-3, fotos de hallazgos, correos de contacto.
#    La passphrase de GPG no es una comodidad: es el control técnico que la
#    LFPDPPP exige sobre ese archivo. Se guarda en un lugar DISTINTO del bucket.
#    Ver docs/08_SEGURIDAD_Y_RLS.md §7 y §8.
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Comprobar el ambiente antes de tocar nada
# ---------------------------------------------------------------------------
faltan=()
[ -n "${SUPABASE_DB_URL:-}" ]       || faltan+=("SUPABASE_DB_URL")
[ -n "${BACKUP_GPG_PASSPHRASE:-}" ] || faltan+=("BACKUP_GPG_PASSPHRASE")
[ -n "${BACKUP_S3_DEST:-}" ]        || faltan+=("BACKUP_S3_DEST")

if [ ${#faltan[@]} -gt 0 ]; then
  echo "::error::Faltan secretos: ${faltan[*]}"
  echo "Se cargan en el repositorio → Settings → Secrets and variables → Actions."
  echo "De dónde sale cada uno: guias/01_GITHUB.md §5 y guias/04_CLOUDFLARE.md §4."
  exit 1
fi

RETENCION="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVO="summit-${STAMP}.sql.gpg"
DEST="${BACKUP_S3_DEST%/}"

# Cloudflare R2 necesita --endpoint-url; S3 de verdad no.
AWS_ARGS=()
if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  AWS_ARGS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
fi

echo "Destino:   ${DEST}/${ARCHIVO}"
echo "Retención: ${RETENCION} días"

# ---------------------------------------------------------------------------
# 2. Volcar
#
# Formato PLANO, no custom. El respaldo tiene que poder restaurarse con un
# `psql -f` desde cualquier máquina, sin depender de que la versión de
# pg_restore coincida. Un respaldo que sólo abre una herramienta específica es
# un respaldo con una condición escondida.
#
# Se intenta incluir el schema `auth` porque ahí viven los usuarios. Sin él, un
# desastre significa volver a invitar a toda la firma y a todos los contactos
# de portal uno por uno. Si el rol del pooler no alcanza para leerlo, se sigue
# con `public` a solas y se avisa — pero no se cae el respaldo entero.
# ---------------------------------------------------------------------------
CON_AUTH=1
if ! pg_dump "$SUPABASE_DB_URL" \
       --format=plain --no-owner --no-acl \
       --schema=public --schema=auth \
       --file=volcado.sql 2>error_dump.txt; then
  echo "::warning::No se pudo volcar el schema 'auth'. Detalle:"
  sed 's/^/    /' error_dump.txt
  echo "Reintentando sólo con 'public'..."
  CON_AUTH=0
  pg_dump "$SUPABASE_DB_URL" \
    --format=plain --no-owner --no-acl \
    --schema=public \
    --file=volcado.sql
fi

# ---------------------------------------------------------------------------
# 3. Verificar que el volcado no salió hueco
#
# El modo de falla que de verdad muerde no es el que truena: es el que termina
# en verde con un archivo de 400 bytes. Pasa cuando las credenciales caducaron
# y el servidor devuelve un dump vacío pero con código de salida 0.
# ---------------------------------------------------------------------------
BYTES="$(wc -c < volcado.sql)"
echo "Volcado: ${BYTES} bytes ($(du -h volcado.sql | cut -f1))"

if [ "$BYTES" -lt 10000 ]; then
  echo "::error::El volcado pesa ${BYTES} bytes. Eso no es una base, es un error silencioso."
  echo "--- Contenido completo ---"
  cat volcado.sql
  exit 1
fi

# Conteo informativo: sirve para comparar contra el respaldo de ayer.
echo "Tablas en el volcado: $(grep -c '^CREATE TABLE' volcado.sql || echo 0)"
echo "Políticas RLS:        $(grep -c '^CREATE POLICY' volcado.sql || echo 0)"
[ "$CON_AUTH" -eq 1 ] && echo "Incluye el schema auth (usuarios)." || echo "SIN el schema auth."

# ---------------------------------------------------------------------------
# 4. Cifrar y subir
# ---------------------------------------------------------------------------
gpg --batch --yes --symmetric --cipher-algo AES256 \
    --passphrase "$BACKUP_GPG_PASSPHRASE" \
    -o "$ARCHIVO" volcado.sql

rm -f volcado.sql   # el texto plano no sobrevive al job

echo "Cifrado: $(du -h "$ARCHIVO" | cut -f1)"
aws "${AWS_ARGS[@]}" s3 cp "$ARCHIVO" "${DEST}/"

# ---------------------------------------------------------------------------
# 5. Rotar
#
# Se borra por fecha leída del nombre del archivo, no por la fecha de
# modificación del objeto: copiar un respaldo entre buckets le cambia la fecha
# de modificación y borraría lo que no toca.
# ---------------------------------------------------------------------------
LIMITE="$(date -u -d "${RETENCION} days ago" +%Y%m%d)"
echo "Borrando respaldos anteriores al ${LIMITE}..."

aws "${AWS_ARGS[@]}" s3 ls "${DEST}/" | awk '{print $4}' | grep '^summit-.*\.sql\.gpg$' | while read -r viejo; do
  fecha="${viejo#summit-}"
  fecha="${fecha:0:8}"
  if [ "$fecha" -lt "$LIMITE" ] 2>/dev/null; then
    echo "  - $viejo"
    aws "${AWS_ARGS[@]}" s3 rm "${DEST}/${viejo}"
  fi
done

echo "Respaldo terminado: ${ARCHIVO}"
