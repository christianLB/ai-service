# 🧪 Pruebas de Comandos Telegram - Revenue System

## 📱 Comandos para Probar en tu Bot de Telegram

### 1. **Crear Cliente y Factura**
```
/invoice create "Empresa ABC" 1500 "Desarrollo de software"
```
Esto creará:
- Un nuevo cliente "Empresa ABC" si no existe
- Una factura por €1,500 + IVA
- Número automático: FAC-2025-0001

### 2. **Ver Lista de Facturas**
```
/invoice list
```
Mostrará todas las facturas con:
- Estado (borrador, enviada, pagada)
- Totales y resúmenes

### 3. **Ver Ingresos del Mes**
```
/revenue month
```
Mostrará:
- Total facturado
- Total cobrado
- Pendiente de cobro

### 4. **Ver Desglose de Ingresos**
```
/revenue breakdown month
```
Mostrará ingresos por:
- Cliente
- Categoría
- Estado

### 5. **Ver Pagos Pendientes**
```
/pending
```
Lista todas las facturas:
- Pendientes de pago
- Vencidas
- Con botones de acción

### 6. **Lista de Clientes**
```
/client list
```
Muestra:
- Todos los clientes
- Total facturado por cliente
- Ranking por ingresos

### 7. **Balance de Cliente**
```
/client balance "Empresa ABC"
```
Muestra:
- Facturas del cliente
- Pagos realizados
- Balance pendiente

### 8. **Registrar un Pago**
```
/payment record "Empresa ABC" 1815
```
Registra el pago y:
- Lo aplica a facturas pendientes
- Actualiza el balance
- Notifica el resultado

## 🔧 Comandos Adicionales

### Ver Ayuda
```
/help
```

### Estado del Sistema
```
/status
```

## 💡 Tips de Uso

1. **Nombres con espacios**: Usa comillas para nombres de empresas
   - ✅ `/invoice create "Mi Empresa SL" 1000`
   - ❌ `/invoice create Mi Empresa SL 1000`

2. **Montos**: Sin símbolo de moneda
   - ✅ `/invoice create Cliente 1500`
   - ❌ `/invoice create Cliente €1,500`

3. **Períodos**: today, week, month, year
   - `/revenue today`
   - `/revenue year`

## 🚀 Flujo de Prueba Sugerido

1. Crear 2-3 clientes con facturas
2. Marcar una como enviada con `/invoice send [ID]`
3. Registrar un pago parcial
4. Ver el revenue y pending
5. Consultar balance de cliente

## ⚠️ Notas

- Los IDs de factura aparecerán en las respuestas
- El IVA está configurado al 21%
- Las facturas vencen a 30 días por defecto
- Los comandos responden con botones interactivos cuando es útil