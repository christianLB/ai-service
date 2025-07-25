# 🔐 Sistema de Autenticación - Documentación de Implementación

## 📋 Resumen Ejecutivo

Se ha implementado un sistema completo de autenticación JWT para proteger el frontend expuesto a internet, con las siguientes características principales:

- **Autenticación JWT** con tokens de acceso (15min) y refresh tokens (7 días)
- **Bypass condicional** para desarrollo
- **Protección contra ataques** de fuerza bruta
- **Logging de seguridad** completo
- **Headers de seguridad** avanzados

## 🏗️ Arquitectura Implementada

### Backend (Express + PostgreSQL)
- **AuthService**: Manejo de login, logout, refresh tokens
- **Middleware JWT**: Protección de todas las rutas API
- **Brute Force Protection**: Límite de 5 intentos en 15 minutos
- **Security Logger**: Auditoría de todos los eventos de seguridad
- **Rate Limiting**: 5 intentos de login por IP cada 15 minutos

### Frontend (React + Ant Design)
- **Página de Login**: UI elegante con Ant Design
- **AuthContext**: Estado global de autenticación
- **PrivateRoute**: Componente para proteger rutas
- **Auto-refresh**: Renovación automática de tokens expirados
- **Remember Me**: Persistencia opcional de sesión

### Seguridad (Nginx + Headers)
- **Helmet.js**: Headers de seguridad en Express
- **CSP**: Content Security Policy configurado
- **CORS**: Configuración estricta de orígenes
- **Rate Limiting**: Protección contra DDoS
- **Nginx Headers**: X-Frame-Options, X-XSS-Protection, etc.

## 📊 Base de Datos

### Tablas Creadas

```sql
-- Tabla de usuarios
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50),
  is_active BOOLEAN,
  last_login TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Tabla de refresh tokens
refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  revoked_at TIMESTAMP
)

-- Tabla de intentos de login
login_attempts (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  ip_address INET,
  success BOOLEAN,
  attempted_at TIMESTAMP
)

-- Tabla de logs de seguridad
security_logs (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100),
  user_id UUID,
  email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  success BOOLEAN,
  created_at TIMESTAMP
)
```

## 🚀 Comandos de Gestión

### Setup Inicial
```bash
# Configuración completa (migración + seed)
make auth-setup

# Solo migraciones
make auth-migrate

# Solo seed de usuario admin
make auth-seed
```

### Desarrollo
```bash
# Activar bypass de autenticación
make auth-bypass-on

# Desactivar bypass
make auth-bypass-off

# Probar el sistema
make auth-test

# Ver estado de configuración
make auth-status
```

### Seguridad
```bash
# Generar JWT secret seguro
make auth-generate-secret

# Verificar configuración de producción
make auth-prod-check
```

## 🔑 Credenciales por Defecto

**Usuario Admin:**
- Email: `admin@ai-service.local`
- Password: `admin123`

⚠️ **IMPORTANTE**: Cambiar la contraseña por defecto inmediatamente en producción.

## 🛡️ Características de Seguridad

### 1. Protección contra Fuerza Bruta
- Máximo 5 intentos fallidos en 15 minutos
- Bloqueo de 30 minutos tras exceder límite
- Tracking por email e IP

### 2. Tokens Seguros
- Access Token: 15 minutos de vida
- Refresh Token: 7 días de vida
- Rotación automática de refresh tokens
- Blacklist de tokens en logout

### 3. Validación de Inputs
- Email validado y normalizado
- Contraseñas hasheadas con bcrypt (10 rounds)
- Sanitización de todos los inputs

### 4. Headers de Seguridad
```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [política estricta]
```

## 🔧 Configuración de Entorno

### Desarrollo (.env.local)
```env
NODE_ENV=development
JWT_SECRET=development-secret
```

### Producción (.env.production)
```env
NODE_ENV=production
JWT_SECRET=[32+ caracteres aleatorios]
ALLOW_REGISTRATION=false
CORS_ORIGIN=https://your-domain.com
```

## 📝 Flujo de Autenticación

1. **Login**
   - Usuario envía email/password
   - Backend valida credenciales
   - Genera access token (15min) y refresh token (7d)
   - Frontend almacena tokens en localStorage

2. **Peticiones Autenticadas**
   - Frontend incluye access token en header Authorization
   - Backend valida token en cada petición
   - Si token expira, frontend intenta refresh automático

3. **Refresh Token**
   - Frontend detecta 401 y envía refresh token
   - Backend valida y genera nuevos tokens
   - Se invalida el refresh token anterior

4. **Logout**
   - Frontend envía refresh token
   - Backend marca token como revocado
   - Frontend limpia localStorage

## 🐛 Troubleshooting

### "No token provided"
- Verificar que el frontend esté enviando el header Authorization
- Comprobar que el token no haya expirado

### "Too many failed login attempts"
- Esperar 30 minutos o limpiar tabla login_attempts
- Verificar que no haya bots atacando

### "Invalid refresh token"
- El token puede estar expirado o revocado
- Usuario debe hacer login nuevamente

## 🚨 Checklist de Seguridad para Producción

- [ ] Cambiar contraseña del usuario admin por defecto
- [ ] Generar JWT_SECRET fuerte (min 32 caracteres)
- [ ] Configurar CORS_ORIGIN con dominio específico
- [ ] Configurar HTTPS en Nginx
- [ ] Habilitar HSTS headers
- [ ] Configurar firewall
- [ ] Revisar logs de seguridad regularmente
- [ ] Configurar alertas para eventos sospechosos
- [ ] Backup regular de base de datos

## 📈 Monitoreo

El sistema registra automáticamente:
- Todos los intentos de login (exitosos y fallidos)
- Eventos de seguridad (tokens inválidos, accesos denegados)
- Cambios en permisos de usuarios
- Intentos de fuerza bruta detectados

Para ver el reporte de seguridad:
```sql
SELECT * FROM security_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## 🔄 Próximas Mejoras

1. **2FA (Two-Factor Authentication)**
2. **OAuth2 Social Login**
3. **Session Management con Redis**
4. **IP Whitelisting para admin**
5. **Passwordless Authentication**
6. **Audit Trail más detallado**

---

**Última actualización**: 2025-07-11
**Versión**: 1.0.0