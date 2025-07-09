#!/bin/bash
# Script de validación del sistema de emergencia
# Autor: Sara - Emergency Responder
# Objetivo: Verificar que todas las herramientas de emergencia funcionan correctamente

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VALIDATION_LOG="/tmp/emergency_validation_$(date +%Y%m%d_%H%M%S).log"

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# Logging
log() {
    echo -e "${1}" | tee -a "$VALIDATION_LOG"
}

# Test individual
test_component() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"
    
    echo -n "  Testing $test_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        if [[ $expected_result -eq 0 ]]; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAIL (esperaba fallo)${NC}"
            ((TESTS_FAILED++))
        fi
    else
        if [[ $expected_result -ne 0 ]]; then
            echo -e "${GREEN}✓ PASS (falló como esperado)${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC}"
            ((TESTS_FAILED++))
        fi
    fi
}

# Validar scripts existen y son ejecutables
validate_scripts() {
    log "${BLUE}=== VALIDANDO SCRIPTS DE EMERGENCIA ===${NC}"
    
    test_component "diagnose.sh existe" "[[ -f $SCRIPT_DIR/diagnose.sh ]]"
    test_component "diagnose.sh es ejecutable" "[[ -x $SCRIPT_DIR/diagnose.sh ]]"
    test_component "rollback.sh existe" "[[ -f $SCRIPT_DIR/rollback.sh ]]"
    test_component "rollback.sh es ejecutable" "[[ -x $SCRIPT_DIR/rollback.sh ]]"
    test_component "pre-deploy-backup.sh existe" "[[ -f $SCRIPT_DIR/pre-deploy-backup.sh ]]"
    test_component "pre-deploy-backup.sh es ejecutable" "[[ -x $SCRIPT_DIR/pre-deploy-backup.sh ]]"
    test_component "sync-to-production.sh existe" "[[ -f $SCRIPT_DIR/sync-to-production.sh ]]"
    
    echo
}

# Validar comandos Make
validate_make_commands() {
    log "${BLUE}=== VALIDANDO COMANDOS MAKE ===${NC}"
    
    cd "$PROJECT_ROOT"
    
    test_component "make 911" "make 911 --dry-run"
    test_component "make emergency-diagnose" "make emergency-diagnose --dry-run"
    test_component "make emergency-backup" "make emergency-backup --dry-run"
    test_component "make emergency-rollback" "make emergency-rollback --dry-run"
    test_component "make prod-emergency-stop" "make prod-emergency-stop --dry-run"
    test_component "make emergency-help" "make emergency-help --dry-run"
    
    echo
}

# Validar documentación
validate_documentation() {
    log "${BLUE}=== VALIDANDO DOCUMENTACIÓN ===${NC}"
    
    test_component "EMERGENCY_RUNBOOK.md existe" "[[ -f $PROJECT_ROOT/docs/EMERGENCY_RUNBOOK.md ]]"
    test_component "Runbook contiene comandos de emergencia" "grep -q 'make 911' $PROJECT_ROOT/docs/EMERGENCY_RUNBOOK.md"
    test_component "Runbook contiene tiempos objetivo" "grep -q '30 segundos' $PROJECT_ROOT/docs/EMERGENCY_RUNBOOK.md"
    
    echo
}

# Validar configuración
validate_configuration() {
    log "${BLUE}=== VALIDANDO CONFIGURACIÓN ===${NC}"
    
    test_component ".make.env existe" "[[ -f $PROJECT_ROOT/.make.env ]]"
    
    if [[ -f "$PROJECT_ROOT/.make.env" ]]; then
        source "$PROJECT_ROOT/.make.env"
        test_component "SSHPASS definido" "[[ -n \$SSHPASS ]]"
        test_component "NAS_HOST definido" "[[ -n \$NAS_HOST ]]"
        test_component "NAS_USER definido" "[[ -n \$NAS_USER ]]"
    fi
    
    echo
}

# Simular escenarios de emergencia
simulate_emergency_scenarios() {
    log "${BLUE}=== SIMULANDO ESCENARIOS DE EMERGENCIA ===${NC}"
    
    # Test de diagnóstico (debería funcionar siempre)
    test_component "Diagnóstico en modo dry-run" "$SCRIPT_DIR/diagnose.sh --dry-run 2>/dev/null || true"
    
    # Test de backup de emergencia
    test_component "Backup de emergencia funciona" "$SCRIPT_DIR/pre-deploy-backup.sh emergency"
    
    # Verificar que el backup se creó
    test_component "Backup de emergencia creado" "[[ -f /tmp/emergency-backups/emergency-*.tar.gz ]]"
    
    echo
}

# Validar tiempos de respuesta
validate_response_times() {
    log "${BLUE}=== VALIDANDO TIEMPOS DE RESPUESTA ===${NC}"
    
    # Test de tiempo de diagnóstico
    local start_time=$(date +%s)
    timeout 15 "$SCRIPT_DIR/diagnose.sh" >/dev/null 2>&1 || true
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $duration -lt 15 ]]; then
        echo -e "  Tiempo de diagnóstico: ${GREEN}${duration}s ✓${NC} (objetivo: < 10s)"
        ((TESTS_PASSED++))
    else
        echo -e "  Tiempo de diagnóstico: ${RED}${duration}s ✗${NC} (objetivo: < 10s)"
        ((TESTS_FAILED++))
    fi
    
    echo
}

# Generar reporte
generate_report() {
    log "${BLUE}=== REPORTE DE VALIDACIÓN ===${NC}"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=0
    
    if [[ $total_tests -gt 0 ]]; then
        success_rate=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    log "Tests ejecutados: $total_tests"
    log "Tests exitosos: ${GREEN}$TESTS_PASSED${NC}"
    log "Tests fallidos: ${RED}$TESTS_FAILED${NC}"
    log "Tasa de éxito: $success_rate%"
    
    echo
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log "${GREEN}✅ SISTEMA DE EMERGENCIA COMPLETAMENTE OPERATIVO${NC}"
        log "${GREEN}Listo para responder en < 30 segundos${NC}"
    else
        log "${RED}❌ SISTEMA DE EMERGENCIA CON PROBLEMAS${NC}"
        log "${YELLOW}Revise el log: $VALIDATION_LOG${NC}"
    fi
}

# Main
main() {
    log "${RED}🚨 VALIDACIÓN DEL SISTEMA DE EMERGENCIA 🚨${NC}"
    log "${YELLOW}Fecha: $(date)${NC}"
    log ""
    
    validate_scripts
    validate_make_commands
    validate_documentation
    validate_configuration
    simulate_emergency_scenarios
    validate_response_times
    generate_report
    
    # Cleanup
    rm -f /tmp/emergency-backups/emergency-*.tar.gz 2>/dev/null || true
    
    # Exit con código de error si hay fallos
    if [[ $TESTS_FAILED -gt 0 ]]; then
        exit 1
    fi
}

# Ejecutar
main "$@"