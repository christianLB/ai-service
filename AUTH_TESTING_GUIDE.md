# 🧪 Guía de Pruebas del Sistema de Autenticación

## 📋 Estado Actual

✅ **Completado:**
- Migraciones de base de datos aplicadas
- Usuario admin creado (`admin@ai-service.local` / `admin123`)
- Frontend compilado y corriendo en `http://localhost:5173/`

## 🚀 Cómo Probar

### 1. Frontend (React)

Abre tu navegador en: `http://localhost:5173/`

**Flujo de prueba:**
1. Deberías ver la página de login
2. Intenta acceder a una ruta protegida como `/dashboard` - deberías ser redirigido a `/login`
3. Ingresa las credenciales:
   - Email: `admin@ai-service.local`
   - Password: `admin123`
4. Marca "Remember me" si quieres persistir la sesión
5. Deberías ser redirigido al dashboard

### 2. API (Backend)

**Necesitas primero iniciar el backend:**

```bash
# Opción 1: Con bypass activado (desarrollo)
npm run dev

# Opción 2: Sin TypeScript (si hay errores de compilación)
node -r ts-node/register src/index.ts
```

**Endpoints disponibles:**

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}'

# Get current user (necesita token)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Logout (necesita token)
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# Refresh token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### 3. Pruebas Automatizadas

```bash
# Ejecutar suite de pruebas
node test-auth.js
```

## 🔧 Configuración

### Desarrollo

En `.env.local`:
```env
NODE_ENV=development
```

### Producción

En `.env.production`:
```env
NODE_ENV=production
JWT_SECRET=[generar con: openssl rand -base64 32]
```

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Verificar conexión
PGPASSWORD=ultra_secure_password_2025 psql -h localhost -p 5434 -U ai_user -d ai_service
```

### "TypeScript compilation errors"
```bash
# Ignorar errores de tipos temporalmente
node --loader ts-node/esm --experimental-specifier-resolution=node src/index.ts
```

### "Frontend no se conecta al backend"
- Verificar que el backend esté en puerto 3001
- Verificar CORS en el backend
- Revisar la consola del navegador

## 📊 Verificación de Base de Datos

```sql
-- Ver usuarios
SELECT email, full_name, role, last_login FROM users;

-- Ver intentos de login
SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT 10;

-- Ver logs de seguridad
SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 10;

-- Ver refresh tokens activos
SELECT * FROM refresh_tokens WHERE revoked_at IS NULL;
```

## ✅ Checklist de Validación

- [ ] Página de login se muestra correctamente
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas muestra error
- [ ] Tokens se guardan en localStorage
- [ ] Rutas protegidas redirigen a login sin auth
- [ ] Logout limpia los tokens
- [ ] Remember me persiste la sesión
- [ ] Rate limiting funciona (5 intentos)
- [ ] Auto-refresh de tokens funciona

## 🎯 Próximos Pasos

1. Corregir errores de TypeScript
2. Probar en Docker completo
3. Configurar para producción
4. Añadir tests automatizados