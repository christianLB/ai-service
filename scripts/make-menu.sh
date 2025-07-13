#!/usr/bin/env bash
set -euo pipefail

# Check for gum
if ! command -v gum >/dev/null 2>&1; then
    echo "gum no está instalado. Instálalo y vuelve a intentar." >&2
    exit 1
fi

# Navigate to repository root
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

# Temporary file to store parsed commands
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

for mf in Makefile*; do
    [ -f "$mf" ] || continue
    awk '
    BEGIN { cat="General"; grab=0 }
    {
        if ($0 ~ /^# ===/) {
            grab = 1
            next
        }
        if (grab && $0 ~ /^#/) {
            cat = $0
            sub(/^#\s+/, "", cat)
            gsub(/^\s+|\s+$/, "", cat)
            grab = 0
            next
        }
        if ($0 ~ /^[A-Za-z0-9_.-]+:\s*.*##/) {
            cmd = $1
            sub(/:.*/, "", cmd)
            desc = $0
            sub(/^[^#]*## /, "", desc)
            printf "%s|%s|%s\n", cat, cmd, desc
        }
    }
    ' "$mf" >> "$tmp"
done

# Collect categories
mapfile -t categories < <(cut -d '|' -f1 "$tmp" | sort -u)

if [ ${#categories[@]} -eq 0 ]; then
    echo "No se encontraron comandos"
    exit 1
fi

selected_cat=$(printf '%s\n' "${categories[@]}" | gum choose --header "Selecciona categoría") || exit 1

# Filter commands for selected category
mapfile -t cmd_lines < <(awk -F '|' -v cat="$selected_cat" '$1==cat {print $2 " - " $3}' "$tmp")

if [ ${#cmd_lines[@]} -eq 0 ]; then
    echo "No hay comandos en la categoría seleccionada"
    exit 1
fi

selected_cmd_line=$(printf '%s\n' "${cmd_lines[@]}" | gum choose --header "Comandos en $selected_cat") || exit 1
selected_cmd=${selected_cmd_line%% - *}

echo "Comando seleccionado: $selected_cmd"
if gum confirm "¿Ejecutar 'make $selected_cmd'?"; then
    make "$selected_cmd"
else
    echo "Operación cancelada"
fi
