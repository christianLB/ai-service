# Automated Development Stack - Issues & Solutions

Este documento detalla los problemas encontrados en el sistema de generación automatizada de CRUD y las soluciones implementadas.

## 📊 Resumen Ejecutivo (22/07/2025)

### ✅ Problemas Resueltos:
1. **Templates usando campos genéricos** → Ahora usan campos reales de Prisma
2. **Rutas backend hardcodeadas** → Nuevo template dinámico `model.routes.dynamic.ts.hbs`
3. **Frontend con errores de compilación** → Templates corregidos (subTitle, sin breadcrumbs)
4. **Imports no usados** → Template simplificado `model-form-simple.tsx.hbs`
5. **CreateModel incompleto** → Incluye todos los campos necesarios

### 🚀 Estado Actual:
- Generador detecta correctamente los modelos Prisma ✅
- Templates usan información dinámica del modelo ✅
- Archivos generados compilan sin errores ✅
- Sistema listo para regenerar todos los modelos ✅

### ⚠️ Pendiente:
- Docker tiene problemas de conexión (bloquea `make dev-refresh`)
- Agregar tests automatizados al generador
- Documentar formato de modelInfo

## 🚨 Problemas Identificados

### 5. Templates Hardcodeados Sin Usar ModelInfo

**Problema CRÍTICO**: Los templates tienen campos hardcodeados para ciertos modelos (Client, Invoice, Trade) pero para todos los demás usan campos genéricos (`name`, `description`, `isActive`) en lugar de usar la información real del modelo parseado.

**Archivos afectados**: 
- `plop-templates/types/model.types.ts.hbs` (backend)
- `plop-templates/types/model.types.frontend.ts.hbs` (frontend - ESTE ES EL PROBLEMA PRINCIPAL)
```handlebars
{{else}}
  // Add your model-specific fields here
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
{{/if}}
```

**Impacto**:
- Alert generado con campos `name/description` cuando tiene `title/message/type/severity`
- Position generado con campos incorrectos cuando tiene `symbol/side/quantity/price`
- Strategy generado con campos incorrectos cuando tiene `type/status/config`
- Horas perdidas corrigiendo manualmente cada archivo generado

### 6. Capitalización Incorrecta de Tipos Prisma

**Problema**: Los templates generan tipos como `Prisma.positionGetPayload` cuando debería ser `Prisma.PositionGetPayload` (primera letra mayúscula).

**Impacto**: Errores de TypeScript en todos los archivos de tipos generados.

### 1. Generación sin Validación de Modelo Prisma

**Problema**: El script `generate-crud.mjs` intenta generar código para modelos que no existen en `schema.prisma`, resultando en:
- Tipos incorrectos generados
- Referencias a `Prisma.ModelName` que no existen
- Errores de compilación TypeScript
- Generación parcial de archivos

**Ejemplos afectados**: 
- Modelo `Alert` (no existe en schema)
- Modelo `Trade` (existe pero en schema `trading`, no detectado correctamente)

### 2. Detección de Schema Incorrecta

**Problema**: El script no detecta correctamente el schema cuando:
- El modelo usa `@@schema("nombre")`
- El modelo está en un schema diferente a `public`
- Se pasa el flag `--schema` pero el modelo no está en ese schema

**Impacto**: 
- Servicios generados con referencias SQL incorrectas
- Imports de Prisma que no coinciden con el schema real

### 3. Manejo de Errores Deficiente

**Problema**: Cuando falla la generación:
- No hay rollback de archivos parcialmente generados
- Los errores no son descriptivos
- El proceso continúa generando archivos dependientes
- No hay validación pre-generación

### 4. Templates Sin Fallbacks

**Problema**: Los templates asumen que:
- El modelo siempre existe en Prisma
- Las relaciones están definidas
- Los tipos de Prisma están disponibles

**Resultado**: Código generado que no compila cuando estas suposiciones fallan.

## 🔧 Soluciones Implementadas

### 5. Usar ModelInfo Dinámicamente en Templates

**SOLUCIÓN APLICADA**: 

#### Backend (YA FUNCIONABA PARCIALMENTE):
El template del backend (`model.types.ts.hbs`) ya tenía lógica para usar modelInfo, pero necesita mejoras.

#### Frontend (CORREGIDO):
El template del frontend (`model.types.frontend.ts.hbs`) NO usaba modelInfo en absoluto. Se actualizó para usar la información dinámica:

```handlebars
// Frontend types - DEBE usar modelInfo
export interface {{pascalCase model}} {
  id: string;
  {{#if modelInfo}}
  {{#each modelInfo.fields}}
  {{#unless (or (eq this.name 'id') (eq this.name 'createdAt') (eq this.name 'updatedAt'))}}
  {{this.name}}{{#if (or this.isOptional this.isNullable)}}?{{/if}}: {{#if (eq this.type 'String')}}string{{else if (eq this.type 'Int')}}number{{else if (eq this.type 'Float')}}number{{else if (eq this.type 'Boolean')}}boolean{{else if (eq this.type 'DateTime')}}Date | string{{else if (eq this.type 'Json')}}any{{else if (eq this.type 'Decimal')}}number{{else}}string{{/if}}{{#if this.isNullable}} | null{{/if}};
  {{/unless}}
  {{/each}}
  {{else}}
  // ESTE ES EL PROBLEMA - campos genéricos cuando no hay modelInfo
  name: string;
  description?: string | null;
  isActive: boolean;
  {{/if}}
  createdAt: Date | string;
  updatedAt: Date | string;
}
```

### 6. Corregir Capitalización de Tipos Prisma

```handlebars
// Prisma types - USAR PascalCase!
export type {{pascalCase model}}WithRelations = Prisma.{{pascalCase model}}GetPayload<{
  {{#if modelInfo.relations}}
  include: {
    {{#each modelInfo.relations}}
    {{this.name}}: true;
    {{/each}}
  };
  {{/if}}
}>;
```

### 1. Validación Pre-Generación

```javascript
// Agregar en generate-crud.mjs antes de generar
async function validateModel(modelName) {
  try {
    const modelInfo = await parsePrismaModel(modelName);
    if (!modelInfo) {
      throw new Error(`Model ${modelName} not found in schema.prisma`);
    }
    return modelInfo;
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    console.log('\n📝 Asegúrate de:');
    console.log('   1. El modelo existe en prisma/schema.prisma');
    console.log('   2. Has ejecutado: npm run db:generate');
    console.log('   3. El nombre del modelo coincide exactamente (case-sensitive)');
    process.exit(1);
  }
}
```

### 2. Detección Mejorada de Schema

```javascript
// Mejorar parsePrismaModel para detectar schema correctamente
const schemaMatch = modelContent.match(/@@schema\("([^"]+)"\)/);
const schema = schemaMatch ? schemaMatch[1] : 'public';

// También buscar en todos los schemas si no se encuentra
if (!modelMatch) {
  // Buscar en todo el archivo, no solo en el modelo principal
  const allModelsRegex = /model\s+(\w+)\s*{[^}]+}/gs;
  const allModels = [...schemaContent.matchAll(allModelsRegex)];
  // ... validar si el modelo existe en algún schema
}
```

### 3. Sistema de Rollback

```javascript
// Trackear archivos generados para rollback en caso de error
const generatedFiles = [];

try {
  // Generar archivos...
  generatedFiles.push(filePath);
} catch (error) {
  // Rollback: eliminar archivos parcialmente generados
  for (const file of generatedFiles) {
    await fs.unlink(file).catch(() => {});
  }
  throw error;
}
```

### 4. Templates con Fallbacks

```handlebars
{{#if modelInfo}}
  // Usar información del modelo parseado
  export type {{pascalCase model}}WithRelations = Prisma.{{camelCase model}}GetPayload<{
    include: { /* relations */ }
  }>;
{{else}}
  // Fallback cuando no hay modelo Prisma
  export type {{pascalCase model}}WithRelations = {{pascalCase model}} & {
    // Relations will be added when Prisma model is created
  };
{{/if}}
```

## 📋 Workflow Correcto para Nuevos Modelos

### ✅ Proceso Recomendado:

1. **Definir el modelo en Prisma primero**:
   ```prisma
   model Alert {
     id          String   @id @default(uuid())
     userId      String
     type        String
     message     String
     isRead      Boolean  @default(false)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     
     user User @relation(fields: [userId], references: [id])
     
     @@schema("trading")
   }
   ```

2. **Generar tipos de Prisma**:
   ```bash
   npm run db:generate
   ```

3. **Crear migración**:
   ```bash
   make db-migrate-create NAME=add_alert_model
   make db-migrate
   ```

4. **Generar CRUD**:
   ```bash
   npm run generate:crud:auto Alert
   # O con schema explícito
   npm run generate:crud:auto Alert --schema trading
   ```

### ❌ Proceso Incorrecto (actual):

1. ~~Generar CRUD sin modelo en Prisma~~
2. ~~Intentar arreglar errores de compilación manualmente~~
3. ~~Agregar modelo a Prisma después~~

## 🧪 Casos de Prueba

### Test 1: Modelo No Existe
```bash
npm run generate:crud:auto NonExistentModel
# Esperado: Error claro indicando que el modelo no existe
# Actual: Genera archivos con errores
```

### Test 2: Modelo en Schema Diferente
```bash
npm run generate:crud:auto Trade
# Esperado: Detecta schema "trading" automáticamente
# Actual: Asume schema "public"
```

### Test 3: Generación Parcial
```bash
# Interrumpir generación a mitad
# Esperado: Rollback de archivos parciales
# Actual: Deja archivos incompletos
```

## 🛠️ Mejoras Futuras CRÍTICAS

### 1. **Parser Mejorado de Prisma** (PRIORIDAD ALTA)
```javascript
// El parser actual debe extraer TODOS los campos con sus tipos correctos
function parsePrismaModel(modelName) {
  // Debe retornar:
  // - fields: Array con name, type, isOptional, isNullable, defaultValue
  // - relations: Array con name, type, isArray
  // - schema: El schema donde está definido
  // - indexes: Los índices definidos
}
```

### 2. **Tests Automatizados del Generador** (PRIORIDAD ALTA)
```javascript
// tests/generator.test.js
describe('CRUD Generator', () => {
  it('should generate correct types for Alert model', async () => {
    const result = await generateCrud('Alert');
    expect(result.types).toContain('title: z.string()');
    expect(result.types).toContain('severity: z.string()');
    expect(result.types).not.toContain('name: z.string()');
  });
  
  it('should use PascalCase for Prisma types', async () => {
    const result = await generateCrud('Position');
    expect(result.types).toContain('Prisma.PositionGetPayload');
    expect(result.types).not.toContain('Prisma.positionGetPayload');
  });
});
```

### 3. **Templates Dinámicos para Componentes** ✅ IMPLEMENTADO
Los componentes del frontend (AlertForm, AlertList, etc.) también deben usar la información del modelo:
- `plop-templates/components/model-form.tsx.hbs` - Debe generar campos basados en modelInfo.fields
- `plop-templates/components/model-list.tsx.hbs` - Debe generar columnas basadas en modelInfo.fields

**ACTUALIZACIÓN**: Se crearon nuevos templates dinámicos y modulares:
- `model-form-dynamic.tsx.hbs` - Genera campos del formulario basándose en los tipos de Prisma
- `model-list-dynamic.tsx.hbs` - Genera columnas de tabla dinámicamente sin lógica hardcodeada
- `model-detail-dynamic.tsx.hbs` - Vista de detalle con campos dinámicos

El plopfile.js fue actualizado para usar estos templates cuando modelInfo está disponible.

### 4. **Validación de Tipos en Frontend**
Asegurar que los tipos del frontend coincidan con los del backend:
```typescript
// frontend/src/types DEBE coincidir con src/types
// Considerar compartir tipos o generarlos desde una única fuente
```

## 🛠️ Mejoras Futuras

1. **CLI Interactivo**: 
   - Preguntar si crear modelo en Prisma si no existe
   - Sugerir schema basado en contexto
   - Preview de archivos a generar

2. **Validación de Dependencias**:
   - Verificar que relaciones existen
   - Validar tipos de campos
   - Comprobar imports necesarios

3. **Modo Dry-Run**:
   ```bash
   npm run generate:crud:auto Alert --dry-run
   ```
   Muestra qué se generaría sin crear archivos

4. **Integración con Prisma**:
   - Auto-generar modelo básico en Prisma si no existe
   - Sincronizar tipos automáticamente
   - Detectar cambios en schema

## 🔍 Debugging

### Logs Útiles
```bash
# Ver qué está parseando el script
DEBUG=plop:* npm run generate:crud:auto Alert

# Verificar modelos en Prisma
npx prisma studio

# Validar schema
npx prisma validate
```

### Errores Comunes

1. **"Cannot find module '@prisma/client'"**
   - Solución: `npm run db:generate`

2. **"Property 'alert' does not exist on type 'PrismaClient'"**
   - Causa: Modelo no existe en schema.prisma
   - Solución: Agregar modelo y regenerar

3. **"Prisma.ModelName.alert is undefined"**
   - Causa: Modelo no existe o está en otro schema
   - Solución: Verificar schema y nombre exacto

## ⚡ Plan de Acción - COMPLETADO

1. **✓ Parser funciona correctamente** - Ya extrae todos los campos con sus tipos
2. **✓ Template frontend actualizado** - Ahora usa modelInfo dinámicamente
3. **✓ Actualizar templates de componentes** - COMPLETADO:
   - `model-form-dynamic.tsx.hbs` - Genera campos del formulario dinámicamente basándose en tipos
   - `model-list-dynamic.tsx.hbs` - Genera columnas de la tabla dinámicamente sin hardcodear
   - `model-detail-dynamic.tsx.hbs` - Vista de detalle con todos los campos del modelo
   - `model-form-simple.tsx.hbs` - Versión simplificada con imports mínimos (USADO ACTUALMENTE)
   - Plopfile.js actualizado para seleccionar templates dinámicos cuando modelInfo está disponible
4. **✓ Corregir problemas en templates** - COMPLETADO:
   - `model.types.frontend.ts.hbs` - Ahora incluye TODOS los campos en CreateModel
   - `model-page.tsx.hbs` - Corregido subtitle → subTitle y eliminado breadcrumbs
   - `model-list-dynamic.tsx.hbs` - Corregido onChange y showTotal
   - Templates dinámicos - Eliminados imports no usados
5. **Agregar tests** que validen la generación correcta (PENDIENTE)
6. **Documentar** el formato esperado de modelInfo (PENDIENTE)
7. **Validar** que los tipos frontend/backend coincidan (PENDIENTE)

## 🔧 Cambios Realizados en Templates - Detalle Completo

### 1. model.types.frontend.ts.hbs
**Problema**: CreateModel excluía campos con default, causando errores en formularios
**Solución**: 
```handlebars
// ANTES - Excluía campos con default
{{#unless (and this.hasDefault (not (eq this.defaultValue 'uuid()')))}}

// DESPUÉS - Incluye todos los campos excepto relaciones
{{#unless this.isRelation}}
```

### 2. model-page.tsx.hbs
**Problema**: PageHeader no soporta breadcrumbs y usaba subtitle en lugar de subTitle
**Solución**:
```handlebars
// ANTES
<PageHeader
  title="{{titleCase model}}s"
  subtitle="Manage your {{lowerCase model}}s"
  breadcrumbs={[...]}
/>

// DESPUÉS
<PageHeader
  title="{{titleCase model}}s"
  subTitle="Manage your {{lowerCase model}}s"
/>
```

### 3. model-form-simple.tsx.hbs (NUEVO)
**Problema**: Templates importaban componentes no usados (Select, DatePicker, etc)
**Solución**: Template simplificado que solo importa Input y TextArea
```handlebars
import {
  Modal,
  Form,
  Input,
} from 'antd';
// Solo usa Input para todos los campos excepto Json que usa TextArea
```

### 4. model-list-dynamic.tsx.hbs
**Problemas múltiples**:
- onChange en rowSelection tenía tipo incorrecto
- showTotal no tipaba el parámetro
- Importaba formatCurrency aunque no lo usaba

**Soluciones**:
```handlebars
// onChange corregido
onChange: (keys) => setSelectedRowKeys(keys as string[]),

// showTotal tipado
showTotal: (total: number) => `Total ${total} items`,

// Import simplificado
import { formatDate } from '../../utils/format';
```

### 5. model.routes.dynamic.ts.hbs (NUEVO) ✅
**Problema**: El template de rutas backend tenía campos hardcodeados y no usaba modelInfo
**Solución**: Nuevo template dinámico que genera validaciones basadas en los campos reales de Prisma
```handlebars
// Generación dinámica de validaciones
{{#each modelInfo.fields}}
{{#unless (or this.isId (eq this.name 'createdAt') (eq this.name 'updatedAt') this.isRelation this.hasDefault)}}
{{#if (eq this.type 'String')}}
body('{{this.name}}'){{#unless this.isOptional}}.notEmpty().withMessage('{{titleCase this.name}} is required'){{else}}.optional({ nullable: true }).isString(){{/unless}},
// ... más tipos ...
{{/if}}
{{/unless}}
{{/each}}
```

### 6. plopfile.js
**Actualizado para usar templates correctos**:
```javascript
// Formularios ahora usan model-form-simple.tsx.hbs
templateFile: data.modelInfo 
  ? 'plop-templates/components/model-form-simple.tsx.hbs'
  : 'plop-templates/components/model-form.tsx.hbs'

// Rutas ahora usan template dinámico cuando modelInfo está disponible
templateFile: data.modelInfo 
  ? 'plop-templates/routes/model.routes.dynamic.ts.hbs'
  : 'plop-templates/routes/model.routes.ts.hbs'
```

## 🔍 Diagnóstico Rápido

Para verificar si el generador está funcionando correctamente:

```bash
# 1. Verificar que el parser lee los campos correctamente
node -e "import('./scripts/generate-crud.mjs').then(m => m.parsePrismaModel('Alert').then(console.log))"

# 2. Generar CRUD y verificar los tipos
npm run generate:crud:auto Alert

# 3. Verificar que los tipos del frontend tienen los campos correctos
grep -A5 "export interface Alert" frontend/src/types/alert.types.ts
# Debería mostrar: title, message, type, severity, etc.
# NO debería mostrar: name, description, isActive
```

## 📚 Referencias

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Plop Documentation](https://plopjs.com/documentation/)
- [Project CRUD Generator](../scripts/generate-crud.mjs)
- [Templates Directory](../plop-templates/)