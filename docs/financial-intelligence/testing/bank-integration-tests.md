# Script de Prueba Manual - Integración de Cuentas Bancarias

## Revisión Arquitectónica

### Frontend (BankAccounts.tsx)
✅ **Cambios implementados:**
- Se agregó interface `StoredRequisition` para persistencia en localStorage
- Se implementó sistema de almacenamiento con expiración (1 hora)
- Se agregaron estados adicionales: `requisitionId`, `authLoading`, `completeLoading`, `checkingAuth`
- Se detecta automáticamente si hay una autorización pendiente al cargar el componente

### Backend (financial.ts)
✅ **Cambios implementados:**
- Se agregó validación de formato UUID para requisitionId
- Se mejoró el logging con prefijos `[complete-setup]`
- Se agregaron mensajes de error más descriptivos
- Se valida que requisitionId no sea null/undefined

## Problemas Identificados

### 1. Falta completar la implementación del frontend
El agente de frontend parece haber dejado la implementación incompleta. Faltaría:
- Actualizar `handleSetupBBVA` para guardar el requisitionId en localStorage
- Actualizar `handleCompleteSetup` para usar el requisitionId almacenado
- Limpiar localStorage después de completar exitosamente

### 2. Manejo de errores inconsistente
- El frontend no maneja todos los casos de error del backend
- No hay reintentos automáticos en caso de fallo temporal

### 3. Falta de feedback visual
- No se usan los estados `authLoading`, `completeLoading`, `checkingAuth` para mostrar spinners

## Script de Prueba Manual

### Preparación
1. Asegúrate de tener el ambiente de desarrollo levantado:
   ```bash
   make dev-up
   ```

2. Verifica que las variables de entorno estén configuradas:
   ```bash
   grep GO_SECRET .env.local
   ```

### Flujo de Prueba Completo

#### Test 1: Flujo Normal Completo
1. **Acceder a la página de cuentas bancarias**
   - Navegar a: http://localhost:3000/bank-accounts
   - Verificar que se muestre el mensaje "No hay cuentas conectadas"

2. **Iniciar conexión con BBVA**
   - Click en "Conectar Cuenta"
   - Click en la tarjeta de BBVA
   - Verificar que se abra una nueva ventana con la URL de autorización
   - Verificar en la consola del navegador (F12) que se guardó el requisitionId

3. **Simular autorización en el banco**
   - En la ventana del banco, completar el proceso de autorización
   - Volver a la aplicación

4. **Completar el setup**
   - Click en "He completado la autorización"
   - Verificar que se muestre mensaje de éxito
   - Verificar que se carguen las cuentas en la tabla

#### Test 2: Recuperación de Sesión
1. **Iniciar proceso de conexión**
   - Repetir pasos 1-2 del Test 1
   - NO completar la autorización en el banco

2. **Cerrar y reabrir la aplicación**
   - Cerrar la pestaña del navegador
   - Abrir nueva pestaña con http://localhost:3000/bank-accounts
   - Verificar que aparezca el mensaje "Tienes una autorización pendiente de completar"
   - Verificar que el modal se abra automáticamente en el paso 2

3. **Completar desde sesión recuperada**
   - Completar autorización en el banco
   - Click en "He completado la autorización"
   - Verificar éxito

#### Test 3: Expiración de Sesión
1. **Modificar tiempo de expiración para testing**
   - En las herramientas de desarrollo, ejecutar:
   ```javascript
   // Guardar requisition con timestamp antiguo
   localStorage.setItem('bank_requisition_pending', JSON.stringify({
     requisitionId: 'test-123',
     timestamp: Date.now() - 3700000, // Más de 1 hora
     bankName: 'BBVA'
   }));
   ```

2. **Recargar página**
   - Verificar que NO aparezca mensaje de autorización pendiente
   - Verificar que localStorage esté limpio

#### Test 4: Manejo de Errores

1. **RequisitionId inválido**
   - Abrir herramientas de desarrollo
   - En Network, simular respuesta de error del backend
   - Verificar que se muestre mensaje de error apropiado

2. **Error de red**
   - Desconectar internet o usar Network throttling
   - Intentar completar setup
   - Verificar mensaje de error de conexión

### Verificación en Backend

1. **Logs del servidor**
   ```bash
   make dev-logs | grep complete-setup
   ```

2. **Verificar base de datos**
   ```bash
   make dev-db-connect
   SELECT * FROM financial.accounts;
   SELECT * FROM financial.requisitions ORDER BY created_at DESC LIMIT 5;
   ```

### Casos Edge a Probar

1. **Múltiples pestañas abiertas**
   - Abrir 2 pestañas con la misma página
   - Iniciar proceso en una
   - Verificar comportamiento en la otra

2. **Navegación durante el proceso**
   - Iniciar proceso
   - Navegar a otra página
   - Volver
   - Verificar que se mantenga el estado

3. **Refresh durante autorización**
   - F5 en diferentes momentos del proceso
   - Verificar recuperación correcta

## Checklist de Validación

- [ ] El requisitionId se guarda correctamente en localStorage
- [ ] La recuperación de sesión funciona tras cerrar/abrir
- [ ] La expiración de 1 hora funciona correctamente
- [ ] Los mensajes de error son claros y útiles
- [ ] No hay errores en la consola del navegador
- [ ] Los logs del backend son informativos
- [ ] La UI muestra feedback visual durante operaciones
- [ ] El localStorage se limpia después de completar
- [ ] El proceso es resistente a interrupciones

## Métricas de Éxito

- Tiempo promedio para completar conexión: < 2 minutos
- Tasa de éxito en primer intento: > 90%
- Recuperación exitosa de sesiones interrumpidas: 100%
- Mensajes de error comprensibles: 100%