# Automated Development Stack

Sistema de generación automatizada de CRUD para el proyecto AI Service.

## 🚀 Características

- ✅ Generación completa de CRUD (Create, Read, Update, Delete)
- ✅ Validación pre-generación con Prisma schema
- ✅ Detección automática de campos y relaciones
- ✅ Sistema de rollback en caso de errores
- ✅ Soporte multi-schema (financial, public, trading)
- ✅ TypeScript con validación Zod
- ✅ React con TanStack Query
- ✅ Mensajes de error claros y útiles

## 📋 Prerequisitos

1. **Modelo definido en Prisma** (`prisma/schema.prisma`)
2. **Tipos de Prisma generados** (`npm run db:generate`)
3. **Node.js 20+** y **npm**

## 🎯 Uso Rápido

```bash
# 1. Define tu modelo en prisma/schema.prisma
# 2. Genera tipos de Prisma
npm run db:generate

# 3. Genera CRUD automáticamente
npm run generate:crud:auto ModelName

# Con schema específico
npm run generate:crud:auto ModelName --schema trading

# Con features específicas
npm run generate:crud:auto ModelName --features list,form,api
```

## 🏗️ Workflow Completo

### 1. Definir Modelo en Prisma

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  categoryId  String   @db.Uuid
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  category Category @relation(fields: [categoryId], references: [id])
  
  @@index([categoryId])
  @@map("products")
  @@schema("public")
}
```

### 2. Generar Tipos de Prisma

```bash
npm run db:generate
```

### 3. Crear Migración

```bash
make db-migrate-create NAME=add_product_model
make db-migrate
```

### 4. Generar CRUD

```bash
npm run generate:crud:auto Product
```

### 5. Archivos Generados

```
Backend:
├── src/types/product.types.ts        # Tipos y schemas Zod
├── src/services/product.service.ts   # Lógica de negocio
└── src/routes/product.routes.ts      # Endpoints API

Frontend:
├── frontend/src/types/product.types.ts     # Tipos TypeScript
├── frontend/src/hooks/use-product.ts       # React Query hooks
├── frontend/src/components/product/
│   ├── ProductList.tsx                     # Lista con paginación
│   └── ProductForm.tsx                     # Formulario create/edit
└── frontend/src/pages/product/index.tsx    # Página principal
```

## 🛡️ Sistema de Validación

El generador incluye múltiples capas de validación:

### Pre-Generación
- ✅ Verifica que el modelo existe en Prisma
- ✅ Detecta el schema correcto automáticamente
- ✅ Valida campos y relaciones
- ✅ Muestra modelos disponibles si hay error

### Durante Generación
- ✅ Rollback automático en caso de error
- ✅ Validación de templates
- ✅ Escape correcto de caracteres especiales

### Post-Generación
- ✅ Linting automático
- ✅ Validación de compilación TypeScript
- ✅ Reporte detallado de archivos creados

## 🔧 Opciones de Comando

```bash
npm run generate:crud:auto <modelo> [opciones]

Opciones:
  --schema <nombre>     Schema de la BD (default: detectado automáticamente)
  --features <lista>    Features separadas por coma (default: todas)
                       Opciones: list,form,detail,api,service,hooks,tests
  --no-relations       Sin relaciones (default: con relaciones si existen)
  --skip-validation    Omitir validación TypeScript al final
```

## 📝 Features Disponibles

### Backend Features
- **api**: REST endpoints con validación Zod
- **service**: Capa de servicios con Prisma
- **types**: TypeScript types y Zod schemas

### Frontend Features
- **list**: Componente lista con paginación y búsqueda
- **form**: Formulario para crear/editar
- **detail**: Vista detalle (próximamente)
- **hooks**: React Query hooks
- **tests**: Tests unitarios (opcional)

## 🚨 Manejo de Errores

### Error: Modelo no existe
```
❌ Model "Product" not found in schema.prisma

📋 Available models:
   - Client
   - Invoice
   - User

💡 Did you mean: Client?
```

**Solución**: Define el modelo en `prisma/schema.prisma` primero

### Error: Archivos existentes
```
❌ File already exists
 -> /src/types/product.types.ts
```

**Solución**: Elimina los archivos existentes o usa otro nombre de modelo

### Error: Compilación TypeScript
```
⚠️  La compilación TypeScript falló. Revisa los errores:
   src/services/product.service.ts(15,5): error TS2304: Cannot find name 'Prisma'.
```

**Solución**: Ejecuta `npm run db:generate` para generar tipos de Prisma

## 🎨 Personalización

### Templates
Los templates están en `/plop-templates/`:
- `types/model.types.dynamic.ts.hbs` - Tipos con detección dinámica
- `services/model.service.ts.hbs` - Servicio CRUD
- `components/model-list.tsx.hbs` - Lista React
- `components/model-form.tsx.hbs` - Formulario React

### Helpers Disponibles
- `{{pascalCase}}` - PascalCase (ej: ProductList)
- `{{camelCase}}` - camelCase (ej: productList)
- `{{kebabCase}}` - kebab-case (ej: product-list)
- `{{titleCase}}` - Title Case (ej: Product List)
- `{{lowerCase}}` - lowercase (ej: product)
- `{{upperCase}}` - UPPERCASE (ej: PRODUCT)

## 🔍 Troubleshooting

### 1. Parse error en templates
**Problema**: `Parse error on line X: Expecting 'CLOSE_RAW_BLOCK'...`

**Causa**: Dobles llaves `{{` en el código JSX/TypeScript

**Solución**: Ya corregido automáticamente con escape `\{{`

### 2. Schema no detectado
**Problema**: Genera con schema "public" cuando debería ser otro

**Causa**: El modelo no tiene `@@schema("nombre")`

**Solución**: Agrega `@@schema("trading")` al modelo o usa `--schema trading`

### 3. Relaciones no detectadas
**Problema**: No genera código para relaciones

**Causa**: Relaciones mal definidas en Prisma

**Solución**: Verifica que las relaciones tengan `@relation` correctamente

## 📚 Ejemplos Completos

### Modelo Simple
```bash
# Modelo User básico
npm run generate:crud:auto User
```

### Modelo con Schema
```bash
# Modelo en schema trading
npm run generate:crud:auto Trade --schema trading
```

### Solo Backend
```bash
# Solo API y servicio
npm run generate:crud:auto Order --features api,service,types
```

### Con Tests
```bash
# Incluir tests
npm run generate:crud:auto Product --features list,form,api,service,hooks,tests
```

## 🚀 Mejoras Recientes (2024)

1. **Validación Pre-Generación**: Verifica modelo en Prisma antes de generar
2. **Detección de Schema**: Detecta automáticamente el schema del modelo
3. **Sistema de Rollback**: Revierte archivos en caso de error
4. **Mensajes Mejorados**: Errores claros con sugerencias útiles
5. **Templates Robustos**: Manejo correcto de casos edge
6. **Escape Automático**: Corrige problemas con dobles llaves en templates

## 🤝 Contribuir

Para mejorar el generador:

1. Los templates están en `/plop-templates/`
2. El script principal está en `/scripts/generate-crud.mjs`
3. La configuración está en `/plopfile.js`

## 📖 Ver También

- [AUTOMATED-DEVELOPMENT-STACK-ISSUES.md](./AUTOMATED-DEVELOPMENT-STACK-ISSUES.md) - Problemas conocidos y soluciones
- [Prisma Documentation](https://www.prisma.io/docs)
- [Plop Documentation](https://plopjs.com/)