# GoCardless Bank Account Data API — Implementación

## 📋 Descripción general

GoCardless ofrece acceso a datos bancarios vía Open Banking (PSD2) a través de su API `Bank Account Data`. Hay dos entornos:

- **Sandbox** → para pruebas, con datos simulados.
- **Live** → para producción, con datos reales y cumplimiento normativo.

Ambos utilizan los mismos endpoints (`https://bankaccountdata.gocardless.com/api/v2/…`), pero difieren en cómo se obtiene el `access_token` y en los datos devueltos.

---

## 🔄 Flujo de autenticación

### Entorno Sandbox

1️⃣ Ingresa al portal [Bank Account Data Sandbox](https://manage-sandbox.gocardless.com/) y genera un `access_token` desde la sección correspondiente.

2️⃣ Usa ese `access_token` directamente en las cabeceras de tus peticiones:

```http
Authorization: Bearer <sandbox_access_token>
```

No necesitas `secret_id` ni `secret_key` para sandbox.

---

### Entorno Live

1️⃣ Solicita a GoCardless tus credenciales live (`secret_id` y `secret_key`).

2️⃣ Realiza una petición POST a `/api/v2/token/new/` para obtener un `access_token` válido para producción:

```http
POST https://bankaccountdata.gocardless.com/api/v2/token/new/
Content-Type: application/json

{
  "secret_id": "<your_secret_id>",
  "secret_key": "<your_secret_key>"
}
```

Respuesta:

```json
{
  "access": "<access_token>"
}
```

3️⃣ Usa ese `access_token` en tus peticiones posteriores:

```http
Authorization: Bearer <access_token>
```

---

## 🔄 Flujo de uso de la API (común a ambos entornos)

Una vez obtenido el `access_token` (por cualquiera de los dos flujos), las llamadas a la API son iguales:

### Ejemplo: obtener cuentas

```http
GET https://bankaccountdata.gocardless.com/api/v2/accounts
Authorization: Bearer <access_token>
```

### Otros endpoints útiles

- `/accounts/{id}/balances` → saldos
- `/accounts/{id}/transactions` → movimientos
- `/institutions/` → lista de bancos soportados

---

## 🚀 Resumen de diferencias

| Aspecto                | Sandbox                           | Live                       |
| ---------------------- | --------------------------------- | -------------------------- |
| **Credenciales**       | Ninguna, token generado en portal | secret\_id + secret\_key   |
| **Access Token**       | Lo genera el portal               | Lo pedís vía `/token/new/` |
| **Datos**              | Simulados (Sandbox Finance)       | Reales, con consentimiento |
| **Certificados HTTPS** | Opcional                          | Obligatorio                |
| **Cumplimiento PSD2**  | No necesario                      | Necesario                  |

---

## 📌 Notas

- Los endpoints y los formatos de respuesta son idénticos entre entornos.
- En live, asegurate de contar con consentimiento del usuario final.
- En ambos casos, el `access_token` tiene una validez limitada y deberías refrescarlo periódicamente.

---

## 📚 Recursos

- [Guía rápida de inicio](https://developer.gocardless.com/bank-account-data/quick-start-guide/)
- [Referencia de la API](https://developer.gocardless.com/api-reference/)
- [Documentación del Sandbox](https://developer.gocardless.com/bank-account-data/sandbox/)

