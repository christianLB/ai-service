# Guía para Claude Code - AI Service Trading Bot con Stack Automatizado

## 🎯 Objetivo del Proyecto

Este proyecto es un sistema de trading algorítmico automatizado que:
- Analiza mercados en tiempo real
- Ejecuta operaciones automáticamente
- Aprende de sus resultados
- Se auto-mejora continuamente

## 🏗️ Stack Tecnológico Actualizado

### Base de Datos
- **PostgreSQL**: Base de datos principal
- **Prisma**: ORM type-safe con generación automática ✨ NUEVO
- **Zod**: Validación de schemas ✨ NUEVO

### Backend
- **Node.js + TypeScript**: Servidor principal
- **Express**: Framework web
- **Prisma Client**: Acceso type-safe a base de datos ✨ NUEVO
- **Socket.io**: Comunicación real-time
- **Bull**: Queue management
- **Jest**: Testing

### Frontend
- **React + TypeScript**: UI framework
- **Vite**: Build tool ultrarrápido
- **Ant Design**: Componentes UI
- **React Hook Form + Zod**: Formularios con validación ✨ NUEVO
- **TanStack Query**: Estado del servidor (ya instalado)
- **TanStack Table**: Tablas con sorting/filtering ✨ NUEVO

### Generación de Código
- **Plop**: Generador de componentes y servicios ✨ NUEVO
- **Prisma Generate**: Tipos TypeScript y schemas ✨ NUEVO

## 🚀 Comandos Principales del Stack Automatizado

### 🤖 Generación Automatizada (SIN INTERACCIÓN HUMANA)
```bash
# COMANDO PRINCIPAL PARA AUTOMATIZACIÓN
npm run generate:crud:auto <Modelo> [opciones]

# Sintaxis completa:
npm run generate:crud:auto <Modelo> \
  --schema <nombre>      # Schema de BD (opcional)
  --features <lista>     # Features separadas por coma
  --no-relations        # Sin relaciones (opcional)

# Ejemplos reales:
npm run generate:crud:auto Alert
npm run generate:crud:auto Trade --schema trading
npm run generate:crud:auto Report --features list,form,api
npm run generate:crud:auto Strategy --schema trading --no-relations

# Ver ayuda:
npm run generate:crud:auto --help
```

### Usando Make
```bash
# Setup inicial
make setup-dev-stack   # Setup completo del stack automatizado

# Generación automatizada
make gen-crud-auto MODEL=Alert  # Sin interacción humana
make gen-crud-auto MODEL=Trade SCHEMA=trading FEATURES=list,form,api

# Generación interactiva (requiere input humano)
make gen-crud          # Abre prompts interactivos
make gen-service       # Genera servicio (interactivo)
make gen-hook          # Genera hook (interactivo)

# Base de datos
make db-generate       # Generar tipos y client Prisma
make db-studio         # Abrir Prisma Studio
make db-push           # Push schema (solo dev)
make db-seed           # Seed con datos de prueba

# Flujo completo
make crud              # gen-crud + db-generate en un comando

# Validación
make validate-deploy   # Lint + TypeCheck + Tests
```

### ⭐ IMPORTANTE PARA CLAUDE
Cuando necesites generar código automáticamente sin interacción humana, SIEMPRE usa:
```bash
npm run generate:crud:auto <Modelo> [opciones]
```
NO uses `make gen-crud` o `npm run generate` ya que requieren input interactivo.

## 🔄 Flujo de Desarrollo con Stack Automatizado

### 1. Crear Nueva Feature (Ejemplo: Reports)

```bash
# 1. Agregar modelo a prisma/schema.prisma
model Report {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  type        String   // financial, trading, performance
  title       String
  content     Json
  format      String   @default("pdf")
  status      String   @default("pending")
  generatedAt DateTime? @map("generated_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([type])
  @@map("ai_service.reports")
}

# 2. Generar migración y tipos
make db-generate

# 3. Generar CRUD completo
make gen-crud
# Responder las preguntas:
# - Modelo: Report
# - Schema: ai_service
# - Features: todas
# - Relaciones: sí

# 4. El generador crea automáticamente:
✓ src/types/report.types.ts          # Tipos y schemas Zod
✓ src/services/report.service.ts     # Lógica de negocio
✓ src/routes/report.routes.ts        # API endpoints
✓ frontend/src/hooks/use-report.ts   # React hooks
✓ frontend/src/components/report/    # Componentes UI
✓ frontend/src/pages/report/         # Página principal

# 5. Verificar y personalizar
make dev              # Iniciar desarrollo
# Navegar a http://localhost:3000/reports
```

### 2. Estructura de Archivos Generados

```
src/
├── types/
│   └── report.types.ts      # Schemas Zod + tipos TypeScript
├── services/
│   └── report.service.ts    # CRUD + lógica de negocio
├── routes/
│   └── report.routes.ts     # Endpoints REST
└── index.ts                 # Auto-actualizado con rutas

frontend/src/
├── hooks/
│   └── use-report.ts        # useReports, useReport, mutations
├── components/
│   └── report/
│       ├── ReportList.tsx   # Tabla con paginación
│       ├── ReportForm.tsx   # Formulario con validación
│       └── ReportDetail.tsx # Vista detalle
└── pages/
    └── report/
        └── index.tsx        # Página principal
```

### 3. Personalización Post-Generación

Los templates generan código funcional pero genérico. Personaliza según necesites:

```typescript
// Ejemplo: Agregar lógica específica al servicio
// src/services/report.service.ts

async generateReport(type: string, params: any, userId: string) {
  // Lógica personalizada
  const data = await this.collectData(type, params);
  const content = await this.processWithAI(data);
  
  // Usar el create generado
  return this.create({
    type,
    title: `${type} Report - ${new Date().toISOString()}`,
    content,
    userId
  });
}
```

## 🧪 Testing con el Nuevo Stack

### Tests Automáticos Generados
```bash
# El generador puede crear:
- src/services/__tests__/report.service.test.ts
- frontend/src/components/report/__tests__/ReportList.test.tsx

# Ejecutar tests
make test               # Todos los tests
npm test -- --watch     # Modo watch
```

### Escribir Tests Personalizados
```typescript
// Los tests usan Jest (próximamente Vitest)
import { reportService } from '../report.service';
import { prisma } from '../../lib/prisma';

describe('ReportService', () => {
  it('should generate financial report', async () => {
    const report = await reportService.generateReport(
      'financial',
      { period: '2024-Q1' },
      'user-123'
    );
    
    expect(report.type).toBe('financial');
    expect(report.status).toBe('pending');
  });
});
```

## 🔐 Integración con Sistema Existente

### Autenticación
Los endpoints generados ya incluyen autenticación:
```typescript
// Todos los routes tienen:
router.use(authenticate);

// El userId se pasa automáticamente a los servicios
const result = await reportService.getAll(query, req.user?.id);
```

### Base de Datos
- Prisma convive con el cliente pg existente
- Migración gradual: usa Prisma para nuevas features
- Las tablas existentes están mapeadas en schema.prisma

### Frontend
- Ant Design se mantiene como sistema de diseño
- React Hook Form se integra perfectamente
- TanStack Query ya estaba instalado

## 📋 Checklist para Nuevas Features

- [ ] Modelo agregado a schema.prisma
- [ ] `make db-generate` ejecutado
- [ ] `make gen-crud` completado
- [ ] Personalización del código generado
- [ ] Tests escritos/actualizados
- [ ] `make validate-deploy` pasa
- [ ] Feature probada localmente
- [ ] Documentación actualizada

## 💡 Tips y Mejores Prácticas

### 1. Generación Inteligente
```bash
# Para módulos complejos
make gen-module
# Crea estructura completa con dashboard, CRUD, reports, etc.
```

### 2. Schemas Compartidos
```typescript
// Los schemas Zod se pueden reutilizar
import { reportSchema } from '../types/report.types';

// En el frontend para validación
const form = useForm({
  resolver: zodResolver(reportSchema)
});

// En el backend para validación
const validated = reportSchema.parse(req.body);
```

### 3. Hooks Optimizados
```typescript
// Los hooks generados incluyen:
- Caché automático con React Query
- Optimistic updates
- Invalidación inteligente
- Gestión de errores con mensajes
```

### 4. Prisma Studio para Debug
```bash
make db-studio
# Interfaz visual para:
# - Ver/editar datos
# - Probar queries
# - Verificar relaciones
```

## 🚨 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
make db-generate  # Genera el cliente
```

### "Type error en schemas"
```bash
make db-generate  # Regenera tipos
npm run typecheck
```

### "Plop no encuentra templates"
```bash
# Verifica que existan:
ls plop-templates/
# Si no, vuelve a clonar o pide ayuda
```

### "Tests fallan después de generar"
```bash
# Los tests generados son ejemplos
# Actualízalos según tu lógica:
- Ajusta los mocks
- Agrega datos de prueba
- Personaliza assertions
```

## 🔄 Migración desde el Sistema Anterior

### Fase 1: Nuevas Features (Actual)
- Usa Prisma para todas las features nuevas
- Mantén pg client para código existente

### Fase 2: Migración Gradual (Futuro)
- Migra servicios uno por uno
- Reemplaza queries SQL por Prisma
- Mantén tests en verde

### Fase 3: Limpieza (Opcional)
- Elimina pg client cuando todo use Prisma
- Unifica sistema de tipos
- Optimiza bundle size

## 🎯 Próximos Pasos Recomendados

1. **Prueba el Sistema**
   ```bash
   make gen-crud
   # Genera un CRUD de prueba (ej: Strategy)
   ```

2. **Explora Prisma Studio**
   ```bash
   make db-studio
   # Visualiza tu base de datos
   ```

3. **Personaliza Templates**
   - Los templates en `plop-templates/` son editables
   - Ajústalos a tu estilo y necesidades

4. **Automatiza Tests**
   - Agrega tests a los templates
   - Configura CI/CD con los nuevos comandos

## 📚 Recursos

- [Prisma Docs](https://www.prisma.io/docs)
- [Plop Docs](https://plopjs.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Docs](https://zod.dev/)

---

**¡Con este stack automatizado, el desarrollo es 10x más rápido! 🚀**

Última actualización: 2025-07-20