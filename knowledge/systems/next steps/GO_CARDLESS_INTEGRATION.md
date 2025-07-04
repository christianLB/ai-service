### 📄 Documento: _Conexión Open Banking con BBVA mediante API GoCardless/Nordigen (PSD2)_

---

#### 🛍️ Objetivo

Implementar un flujo automatizado para obtener los movimientos bancarios de una cuenta BBVA España, conforme a PSD2, utilizando la API pública de GoCardless/Nordigen.

---

### 🔧 Variables necesarias

- `SECRET_ID`: clave pública de API de GoCardless (env: GO_SECRET_ID already set)
- `SECRET_KEY`: clave privada de API de GoCardless (env: GO_SECRET_KEY already set)
- `REDIRECT_URI`: URL de redirección después del consentimiento (puede ser ficticia o funcional)
- `INSTITUTION_ID`: `"BBVA_BBVAESMM"`

---

### 🧱 Paso a paso del flujo

#### 1. **Obtener token de acceso (Bearer token)**

**POST** `https://bankaccountdata.gocardless.com/api/v2/token/new/`

```json
{
  "secret_id": "<SECRET_ID>",
  "secret_key": "<SECRET_KEY>"
}
```

✅ Devuelve: `{ "access": "<ACCESS_TOKEN>" }`

---

#### 2. **Listar bancos disponibles en España**

**GET** `https://bankaccountdata.gocardless.com/api/v2/institutions/?country=ES`

**Headers**:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

📌 Buscar el ID `bbva-es`

---

#### 3. **Crear requisition (consentimiento)**

**POST** `https://bankaccountdata.gocardless.com/api/v2/requisitions/`

```json
{
  "institution_id": "bbva-es",
  "redirect": "<REDIRECT_URI>",
  "reference": "bbva-consent-001"
}
```

**Headers**:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

✅ Devuelve:

```json
{
  "id": "<REQUISITION_ID>",
  "link": "https://ob.gocardless.com/redirect/..."
}
```

😬 El usuario debe visitar `link` para dar consentimiento (login BBVA). Una vez otorgado, continuar.

---

#### 4. **Listar cuentas disponibles tras consentimiento**

**GET** `https://bankaccountdata.gocardless.com/api/v2/accounts/?requisition_id=<REQUISITION_ID>`

**Headers**:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

✅ Devuelve:

```json
{
  "accounts": ["<ACCOUNT_ID_1>", ...]
}
```

---

#### 5. **Obtener transacciones de una cuenta**

**GET** `https://bankaccountdata.gocardless.com/api/v2/accounts/<ACCOUNT_ID>/transactions/`

**Headers**:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

✅ Devuelve:

```json
{
  "transactions": {
    "booked": [...],
    "pending": [...]
  }
}
```

---

### 🔄 Lógica adicional recomendada

- **Persistir** el `access_token`, `requisition_id`, `account_id`, y datos transaccionales localmente.
- Renovar el consentimiento antes de 90 días.
- Guardar cada batch de movimientos con su timestamp para construir historial propio.
- Eliminar `requisition` si ya no se necesita:
  **DELETE** `https://bankaccountdata.gocardless.com/api/v2/requisitions/<REQUISITION_ID>`

---

### ⚠️ Restricciones PSD2

- Solo se puede acceder a datos de los **últimos 90 días** por consentimiento.
- Es necesario renovar el consentimiento cada 90 días.
- GoCardless/Nordigen no permite acceso completo retroactivo.
