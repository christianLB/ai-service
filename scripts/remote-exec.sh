#!/bin/bash
# Helper script para ejecutar comandos remotos con sudo

# Usar las variables de entorno o valores por defecto
NAS_USER="${NAS_USER:-admin}"
NAS_HOST="${NAS_HOST:-192.168.1.11}"

# Si tenemos SUDO_PASS, usarla
if [ -n "$SUDO_PASS" ]; then
    # Ejecutar comando con sudo no interactivo
    if [ -n "$SSHPASS" ]; then
        sshpass -e ssh "${NAS_USER}@${NAS_HOST}" "echo '$SUDO_PASS' | sudo -S $*"
    else
        ssh "${NAS_USER}@${NAS_HOST}" "echo '$SUDO_PASS' | sudo -S $*"
    fi
else
    # Ejecutar comando normal (pedirá contraseña)
    if [ -n "$SSHPASS" ]; then
        sshpass -e ssh "${NAS_USER}@${NAS_HOST}" "sudo $*"
    else
        ssh "${NAS_USER}@${NAS_HOST}" "sudo $*"
    fi
fi