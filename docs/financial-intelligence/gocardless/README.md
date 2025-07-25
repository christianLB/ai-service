# GoCardless Open Banking Flow Simulation

Este repositorio contiene scripts para simular el flujo completo de GoCardless Bank Account Data (Open Banking) usando el API sandbox de GoCardless.

## Descripción

El script principal `gocardless_openbanking_flow.sh` implementa el flujo estándar de Open Banking para acceso a datos bancarios, siguiendo estos pasos:

1. **Autenticación**: Obtiene un token de acceso utilizando credenciales de API (secret_id y secret_key)
2. **Listado de instituciones**: Lista las instituciones financieras disponibles
3. **Creación de acuerdos**: Crea un acuerdo de usuario final (end-user agreement)
4. **Creación de requisición**: Inicia una requisición de acceso a cuenta y obtiene un link de autenticación
5. **Acceso a cuentas**: Después de la autenticación del usuario, obtiene la lista de cuentas disponibles
6. **Acceso a información bancaria**: Para cada cuenta, obtiene:
   - Detalles de la cuenta
   - Saldos de la cuenta
   - Transacciones de la cuenta

## Requisitos

- Bash 4.0 o superior
- Curl
- Credenciales válidas de GoCardless (secret_id y secret_key)

## Uso

### Script Principal: Flujo Completo

```bash
./gocardless_openbanking_flow.sh <secret_id> <secret_key> [institution_id]
```

Ejemplo:
```bash
./gocardless_openbanking_flow.sh 84cf753f-c6f7-4ad9-ad6d-c6d16d3d6bb5 500ecca01eaa2eb9b3fc0e9a6405a70c... SANDBOXFINANCE_SFIN0000
```

Parámetros:
- `secret_id`: ID secreto para el sandbox de GoCardless
- `secret_key`: Clave secreta para el sandbox de GoCardless
- `institution_id`: (Opcional) ID de la institución financiera. Por defecto: "SANDBOXFINANCE_SFIN0000"

### Script de Prueba: Verificar Token

```bash
./gocardless_token_test.sh <secret_id> <secret_key>
```

Este script secundario verifica si las credenciales proporcionadas son válidas obteniendo un token de acceso y probándolo contra el endpoint `/institutions/`.

## Notas importantes sobre el entorno Sandbox

1. **Institución de prueba**: El ID de institución para pruebas en sandbox es `SANDBOXFINANCE_SFIN0000`
2. **Autenticación en sandbox**: En el entorno sandbox, cualquier entrada es válida para los campos de usuario y generador de código
3. **Token de acceso**: Los tokens generados directamente desde el portal no funcionan directamente como Bearer tokens. Es necesario obtener un access token válido mediante el endpoint `/api/v2/token/new/` usando las credenciales secret_id y secret_key
4. **Validez de los tokens**: Los tokens de acceso generados son válidos por 24 horas

## Archivos generados

El script guarda las respuestas API en archivos JSON para facilitar el análisis:

- `token_response.json`: Respuesta de la solicitud de token
- `institutions_response.json`: Lista de instituciones financieras
- `agreement_response.json`: Respuesta de la creación del acuerdo
- `requisition_response.json`: Respuesta de la creación de la requisición
- `requisition_details.json`: Detalles de la requisición después de la autenticación
- `account_*_details.json`: Detalles de cada cuenta
- `account_*_balances.json`: Saldos de cada cuenta
- `account_*_transactions.json`: Transacciones de cada cuenta

## Flujo de autenticación y errores comunes

### Flujo de autenticación correcto
1. Obtener un access token mediante POST a `/api/v2/token/new/` con secret_id y secret_key
2. Usar el token recibido como Bearer token en los headers de todas las peticiones siguientes

### Errores comunes
- **401 Unauthorized (Invalid token)**: Indica que el token no es válido o ha expirado
- **No active account found with the given credentials**: Las credenciales (secret_id y secret_key) no son válidas
- **Institution not found**: La institución solicitada no existe o no está disponible

## Referencias
- [GoCardless Bank Account Data API Documentation](https://bankaccountdata.gocardless.com/api-reference/)
- [GoCardless Quickstart Guide](https://bankaccountdata.gocardless.com/quickstart/)
- [Sandbox Testing Documentation](https://bankaccountdata.gocardless.com/sandbox/)
