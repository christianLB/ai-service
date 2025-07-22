# Stack de Desarrollo Automatizado - Plan de Implementación Completo

## 📋 Resumen Ejecutivo

Este documento guía la implementación de un stack de desarrollo automatizado que integra:
- **Prisma** para gestión de base de datos type-safe
- **Plop** para generación de código consistente
- **Zod** para validación de datos
- **Tu Design System** (@k2600x/design-system) para UI consistente
- **Testing automatizado** para garantizar calidad
- **Makefile** para comandos simplificados

El objetivo es que Claude Code pueda generar features completas con comandos simples, manteniendo consistencia y calidad.

## 🏗️ Arquitectura del Stack

```
┌─────────────────────────────────────────────────┐
│                PostgreSQL                        │
│          (Base de datos existente)               │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│                  Prisma                          │
│    (ORM + Migraciones + Generación de tipos)    │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            Zod + Zod-Prisma                      │
│    (Schemas de validación auto-generados)       │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│                  Plop                            │
│    (Generación de CRUD + Services + Tests)      │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           Tu Design System                       │
│    (Componentes UI consistentes)                │
└─────────────────────────────────────────────────┘
```

## 🚀 Fase 1: Instalación y Configuración Base

### 1.1 Instalar Dependencias

```bash
# Core dependencies
pnpm add prisma @prisma/client
pnpm add zod react-hook-form @hookform/resolvers
pnpm add @tanstack/react-query @tanstack/react-table
pnpm add superjson

# Dev dependencies
pnpm add -D @anatine/zod-prisma @anatine/zod-mock
pnpm add -D plop inquirer-directory
pnpm add -D @types/node tsx
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D @faker-js/faker
```

### 1.2 Configurar Prisma

Crear `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider                         = "zod-prisma-types"
  output                          = "../src/lib/schemas"
  useMultipleFiles                = true
  writeBarrelFiles                = true
  createInputTypes                = false
  createModelTypes                = true
  addInputTypeValidation          = true
  addIncludeType                  = false
  addSelectType                   = false
  validateWhereUniqueInput        = false
  createOptionalDefaultValuesTypes = true
  createRelationValuesTypes       = false
  createPartialTypes              = false
  useDefaultValidators            = true
  coerceDate                      = true
  writeNullishInModelTypes        = false
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Migrar tablas existentes
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  trades            Trade[]
  integrationKeys   IntegrationKey[]
  tradingConfigs    TradingConfig[]
}

model IntegrationKey {
  id             String   @id @default(uuid())
  service        String   // binance, coinbase, claude
  keyType        String   // api_key, secret
  encryptedValue String
  userId         String?
  environment    String   @default("production")
  lastRotated    DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user User? @relation(fields: [userId], references: [id])
  
  @@unique([service, keyType, userId, environment])
}

model Trade {
  id            String      @id @default(uuid())
  userId        String
  symbol        String      // BTC/USD
  action        TradeAction
  amount        Decimal     @db.Decimal(20, 8)
  price         Decimal     @db.Decimal(20, 8)
  exchange      String
  status        TradeStatus @default(PENDING)
  executedAt    DateTime?
  stopLoss      Decimal?    @db.Decimal(20, 8)
  takeProfit    Decimal?    @db.Decimal(20, 8)
  fees          Decimal?    @db.Decimal(20, 8)
  profit        Decimal?    @db.Decimal(20, 8)
  metadata      Json?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, symbol])
  @@index([status])
  @@index([executedAt])
}

model TradingConfig {
  id          String   @id @default(uuid())
  userId      String?
  configKey   String
  configValue Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user User? @relation(fields: [userId], references: [id])
  
  @@unique([userId, configKey])
}

model MarketData {
  id        String   @id @default(uuid())
  symbol    String
  timeframe String   // 1m, 5m, 1h, 1d
  open      Decimal  @db.Decimal(20, 8)
  high      Decimal  @db.Decimal(20, 8)
  low       Decimal  @db.Decimal(20, 8)
  close     Decimal  @db.Decimal(20, 8)
  volume    Decimal  @db.Decimal(20, 8)
  timestamp DateTime
  createdAt DateTime @default(now())
  
  @@unique([symbol, timeframe, timestamp])
  @@index([symbol, timeframe])
  @@index([timestamp])
}

enum TradeAction {
  BUY
  SELL
}

enum TradeStatus {
  PENDING
  EXECUTED
  CANCELLED
  FAILED
}
```

### 1.3 Configurar Scripts en package.json

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "generate": "plop",
    "generate:crud": "plop crud",
    "generate:service": "plop service",
    "generate:hook": "plop hook",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 📝 Fase 2: Configuración de Plop

### 2.1 Crear plopfile.js

```javascript
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function (plop) {
  // Helpers personalizados
  plop.setHelper('eq', (a, b) => a === b);
  plop.setHelper('includes', (array, item) => array?.includes(item));
  
  // Partials reutilizables
  plop.setPartial('imports', `import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '@k2600x/design-system';`);

  // Generador CRUD completo
  plop.setGenerator('crud', {
    description: 'Genera CRUD completo para un modelo Prisma',
    prompts: [
      {
        type: 'input',
        name: 'model',
        message: 'Nombre del modelo Prisma (ej: Trade):',
        validate: (input) => /^[A-Z][a-zA-Z]*$/.test(input) || 'Debe empezar con mayúscula'
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Selecciona las features a generar:',
        choices: [
          { name: 'Lista con paginación', value: 'list', checked: true },
          { name: 'Formulario Create/Edit', value: 'form', checked: true },
          { name: 'Vista detalle', value: 'detail', checked: true },
          { name: 'Modal de confirmación', value: 'modal', checked: true },
          { name: 'Tests', value: 'tests', checked: true },
          { name: 'Storybook stories', value: 'stories', checked: false }
        ]
      }
    ],
    actions: (data) => {
      const actions = [];
      
      // Siempre generar hooks
      actions.push({
        type: 'add',
        path: 'src/hooks/use-{{kebabCase model}}.ts',
        templateFile: 'plop-templates/hooks/use-model.ts.hbs'
      });

      // Generar componentes según features seleccionadas
      if (data.features.includes('list')) {
        actions.push({
          type: 'add',
          path: 'src/components/{{kebabCase model}}/{{pascalCase model}}List.tsx',
          templateFile: 'plop-templates/components/model-list.tsx.hbs'
        });
      }

      if (data.features.includes('form')) {
        actions.push({
          type: 'add',
          path: 'src/components/{{kebabCase model}}/{{pascalCase model}}Form.tsx',
          templateFile: 'plop-templates/components/model-form.tsx.hbs'
        });
      }

      if (data.features.includes('tests')) {
        actions.push({
          type: 'add',
          path: 'src/components/{{kebabCase model}}/__tests__/{{pascalCase model}}List.test.tsx',
          templateFile: 'plop-templates/tests/model-list.test.tsx.hbs'
        });
      }

      // Generar página principal
      actions.push({
        type: 'add',
        path: 'src/pages/{{kebabCase model}}/index.tsx',
        templateFile: 'plop-templates/pages/model-page.tsx.hbs'
      });

      // Actualizar rutas
      actions.push({
        type: 'modify',
        path: 'src/lib/routes.ts',
        pattern: /(\/\/ PLOP_INJECT_ROUTE)/g,
        template: `  { path: '/{{kebabCase model}}', name: '{{titleCase model}}', icon: 'Database' },\n$1`
      });

      return actions;
    }
  });

  // Generador de servicios
  plop.setGenerator('service', {
    description: 'Genera un servicio con métodos CRUD',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del servicio (ej: MarketIntelligence):'
      },
      {
        type: 'checkbox',
        name: 'methods',
        message: 'Métodos a incluir:',
        choices: [
          { name: 'getAll', value: 'getAll', checked: true },
          { name: 'getById', value: 'getById', checked: true },
          { name: 'create', value: 'create', checked: true },
          { name: 'update', value: 'update', checked: true },
          { name: 'delete', value: 'delete', checked: true },
          { name: 'custom', value: 'custom', checked: false }
        ]
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'src/services/{{kebabCase name}}.service.ts',
        templateFile: 'plop-templates/services/service.ts.hbs'
      },
      {
        type: 'add',
        path: 'src/services/__tests__/{{kebabCase name}}.service.test.ts',
        templateFile: 'plop-templates/tests/service.test.ts.hbs'
      }
    ]
  });

  // Generador de hooks personalizados
  plop.setGenerator('hook', {
    description: 'Genera un hook personalizado',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del hook (sin "use" prefix):'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Tipo de hook:',
        choices: ['data-fetching', 'state-management', 'utility']
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'src/hooks/use-{{kebabCase name}}.ts',
        templateFile: 'plop-templates/hooks/hook-{{type}}.ts.hbs'
      }
    ]
  });
}
```

### 2.2 Crear Templates Base

#### plop-templates/components/model-list.tsx.hbs
```handlebars
import { useState } from 'react';
import { {{pascalCase model}} } from '@prisma/client';
import { use{{pascalCase model}}s } from '@/hooks/use-{{kebabCase model}}';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell,
  Button,
  Card,
  LoadingSpinner,
  Pagination,
  SearchInput,
  Select
} from '@k2600x/design-system';
import { {{pascalCase model}}Form } from './{{pascalCase model}}Form';

export function {{pascalCase model}}List() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<{{pascalCase model}} | null>(null);

  const { data, isLoading, error } = use{{pascalCase model}}s({
    page,
    search,
    limit: 10
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{{titleCase model}}s</h2>
        <Button onClick={() => setShowForm(true)}>
          Crear {{titleCase model}}
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar {{lowerCase model}}s..."
        className="mb-4"
      />

      <Table>
        <TableHeader>
          <TableRow>
            {{#each fields}}
            <TableCell>{{label}}</TableCell>
            {{/each}}
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.map((item) => (
            <TableRow key={item.id}>
              {{#each fields}}
              <TableCell>{item.{{name}}}</TableCell>
              {{/each}}
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelected(item);
                    setShowForm(true);
                  }}
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        className="mt-4"
      />

      {showForm && (
        <{{pascalCase model}}Form
          {{lowerCase model}}={selected}
          onClose={() => {
            setShowForm(false);
            setSelected(null);
          }}
        />
      )}
    </Card>
  );
}
```

#### plop-templates/components/model-form.tsx.hbs
```handlebars
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { {{pascalCase model}}Schema } from '@/lib/schemas';
import { use{{pascalCase model}}Mutation } from '@/hooks/use-{{kebabCase model}}';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@k2600x/design-system';

interface {{pascalCase model}}FormProps {
  {{lowerCase model}}?: {{pascalCase model}} | null;
  onClose: () => void;
}

export function {{pascalCase model}}Form({ {{lowerCase model}}, onClose }: {{pascalCase model}}FormProps) {
  const mutation = use{{pascalCase model}}Mutation();
  
  const form = useForm({
    resolver: zodResolver({{pascalCase model}}Schema),
    defaultValues: {{lowerCase model}} || {
      {{#each fields}}
      {{name}}: {{defaultValue}},
      {{/each}}
    }
  });

  const onSubmit = async (data: z.infer<typeof {{pascalCase model}}Schema>) => {
    try {
      if ({{lowerCase model}}) {
        await mutation.update({ id: {{lowerCase model}}.id, data });
      } else {
        await mutation.create(data);
      }
      onClose();
    } catch (error) {
      console.error('Error saving {{lowerCase model}}:', error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{{lowerCase model}} ? 'Editar' : 'Crear'} {{titleCase model}}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {{#each fields}}
            {{#if (eq type "select")}}
            <FormField
              control={form.control}
              name="{{name}}"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{{label}}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona {{label}}" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {{#each options}}
                      <SelectItem value="{{value}}">{{label}}</SelectItem>
                      {{/each}}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {{else}}
            <FormField
              control={form.control}
              name="{{name}}"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{{label}}</FormLabel>
                  <FormControl>
                    <Input 
                      type="{{type}}" 
                      placeholder="{{placeholder}}"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {{/if}}
            {{/each}}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={mutation.isLoading}>
                {{{lowerCase model}} ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### plop-templates/hooks/use-model.ts.hbs
```handlebars
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {{lowerCase model}}Service } from '@/services/{{kebabCase model}}.service';
import type { {{pascalCase model}} } from '@prisma/client';

const QUERY_KEY = '{{kebabCase model}}s';

export function use{{pascalCase model}}s(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => {{lowerCase model}}Service.getAll(params),
  });
}

export function use{{pascalCase model}}(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => {{lowerCase model}}Service.getById(id),
    enabled: !!id,
  });
}

export function use{{pascalCase model}}Mutation() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: {{lowerCase model}}Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{{pascalCase model}}> }) =>
      {{lowerCase model}}Service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: {{lowerCase model}}Service.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isLoading: createMutation.isLoading || updateMutation.isLoading || deleteMutation.isLoading,
  };
}
```

## 🧪 Fase 3: Configuración de Testing

### 3.1 Configurar Vitest

Crear `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
    },
  },
});
```

### 3.2 Setup de Testing

Crear `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 3.3 Utilities de Testing

Crear `src/test/utils.tsx`:

```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const testQueryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

## 🛠️ Fase 4: Makefile para Automatización

Crear `Makefile`:

```makefile
# Variables
DOCKER_COMPOSE = docker-compose
PRISMA = npx prisma
PLOP = npx plop

# Colores para output
GREEN = \033[0;32m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Help
help: ## Muestra esta ayuda
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Database
db-up: ## Levanta la base de datos
	$(DOCKER_COMPOSE) up -d postgres
	@echo "$(GREEN)✓ Base de datos iniciada$(NC)"

db-down: ## Detiene la base de datos
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Base de datos detenida$(NC)"

db-reset: ## Resetea la base de datos
	$(PRISMA) migrate reset --force
	@echo "$(GREEN)✓ Base de datos reseteada$(NC)"

db-migrate: ## Ejecuta las migraciones
	$(PRISMA) migrate dev
	@echo "$(GREEN)✓ Migraciones aplicadas$(NC)"

db-generate: ## Genera el cliente de Prisma y schemas Zod
	$(PRISMA) generate
	@echo "$(GREEN)✓ Cliente Prisma y schemas Zod generados$(NC)"

db-seed: ## Ejecuta el seed de la base de datos
	npm run db:seed
	@echo "$(GREEN)✓ Seed ejecutado$(NC)"

db-studio: ## Abre Prisma Studio
	$(PRISMA) studio

# Generación de código
gen-crud: ## Genera CRUD completo para un modelo
	$(PLOP) crud
	@echo "$(GREEN)✓ CRUD generado$(NC)"

gen-service: ## Genera un servicio
	$(PLOP) service
	@echo "$(GREEN)✓ Servicio generado$(NC)"

gen-hook: ## Genera un hook personalizado
	$(PLOP) hook
	@echo "$(GREEN)✓ Hook generado$(NC)"

gen-all: ## Genera schemas y tipos desde Prisma
	@make db-generate
	@echo "$(GREEN)✓ Todos los schemas generados$(NC)"

# Testing
test: ## Ejecuta todos los tests
	npm test
	@echo "$(GREEN)✓ Tests completados$(NC)"

test-watch: ## Ejecuta tests en modo watch
	npm run test -- --watch

test-coverage: ## Ejecuta tests con coverage
	npm run test:coverage
	@echo "$(GREEN)✓ Coverage generado$(NC)"

test-ui: ## Abre UI de Vitest
	npm run test:ui

# Development
dev: ## Inicia el servidor de desarrollo
	npm run dev

dev-full: db-up ## Inicia todo el entorno de desarrollo
	@make db-migrate
	npm run dev

build: ## Construye la aplicación
	npm run build
	@echo "$(GREEN)✓ Build completado$(NC)"

# Utilities
clean: ## Limpia archivos generados
	rm -rf node_modules .next dist coverage
	@echo "$(GREEN)✓ Limpieza completada$(NC)"

install: ## Instala dependencias
	pnpm install
	@echo "$(GREEN)✓ Dependencias instaladas$(NC)"

setup: install db-up db-migrate db-generate db-seed ## Setup completo del proyecto
	@echo "$(GREEN)✓ Setup completado$(NC)"
	@echo "$(GREEN)Ejecuta 'make dev' para iniciar el desarrollo$(NC)"

# Shortcuts para desarrollo rápido
crud: gen-crud db-generate ## Genera CRUD y actualiza schemas
	@echo "$(GREEN)✓ CRUD y schemas actualizados$(NC)"

# Git helpers
commit: ## Commit con mensaje convencional
	@read -p "Tipo (feat/fix/docs/style/refactor/test/chore): " type; \
	read -p "Mensaje: " msg; \
	git add . && git commit -m "$$type: $$msg"

# Docker
docker-build: ## Construye imagen Docker
	docker build -t ai-service .
	@echo "$(GREEN)✓ Imagen construida$(NC)"

docker-run: ## Ejecuta contenedor Docker
	docker run -p 3000:3000 ai-service

# Validación
validate: ## Valida el código (lint, types, tests)
	npm run lint
	npm run type-check
	npm test
	@echo "$(GREEN)✓ Validación completa$(NC)"

.PHONY: help db-up db-down db-reset db-migrate db-generate db-seed db-studio \
        gen-crud gen-service gen-hook gen-all \
        test test-watch test-coverage test-ui \
        dev dev-full build \
        clean install setup crud commit \
        docker-build docker-run validate
```

## 📚 Fase 5: Actualización de CLAUDE.md

Crear/actualizar `CLAUDE.md`:

```markdown
# Guía para Claude Code - AI Service Trading Bot

## 🎯 Objetivo del Proyecto

Este proyecto es un sistema de trading algorítmico automatizado que:
- Analiza mercados en tiempo real
- Ejecuta operaciones automáticamente
- Aprende de sus resultados
- Se auto-mejora continuamente

## 🏗️ Stack Tecnológico

### Base de Datos
- **PostgreSQL**: Base de datos principal
- **Prisma**: ORM type-safe con generación automática
- **Zod**: Validación de schemas auto-generada desde Prisma

### Frontend
- **Next.js 14**: Framework React con App Router
- **@k2600x/design-system**: Sistema de diseño propio
- **React Hook Form + Zod**: Formularios con validación
- **TanStack Query**: Estado del servidor
- **TanStack Table**: Tablas con sorting/filtering

### Generación de Código
- **Plop**: Generador de componentes y servicios
- **Prisma Generate**: Tipos TypeScript y schemas Zod

### Testing
- **Vitest**: Test runner rápido
- **Testing Library**: Testing de componentes
- **Faker.js**: Datos de prueba

## 🚀 Comandos Principales

### Usando Make (Recomendado)
```bash
make help          # Ver todos los comandos
make setup         # Setup inicial completo
make dev-full      # Desarrollo con DB
make crud          # Generar CRUD completo
make test          # Ejecutar tests
make validate      # Validar código completo
```

### Generación de Código
```bash
make gen-crud      # Genera CRUD completo interactivo
make gen-service   # Genera servicio
make gen-hook      # Genera hook personalizado
```

### Base de Datos
```bash
make db-migrate    # Aplicar migraciones
make db-generate   # Generar tipos y schemas
make db-studio     # Abrir Prisma Studio
make db-reset      # Reset completo
```

## 📁 Estructura del Proyecto

```
src/
├── components/        # Componentes React
│   ├── trade/        # Componentes de trading
│   ├── ui/           # Componentes base (usa design-system)
│   └── shared/       # Componentes compartidos
├── hooks/            # Hooks personalizados
├── services/         # Lógica de negocio
├── lib/              # Utilidades
│   ├── schemas/      # Schemas Zod (auto-generados)
│   ├── prisma.ts     # Cliente Prisma
│   └── utils.ts      # Helpers
├── pages/            # Páginas Next.js
└── test/             # Utilidades de testing
```

## 🔄 Flujo de Desarrollo

### 1. Crear Nueva Feature (Ejemplo: Strategy)

```bash
# 1. Agregar modelo a schema.prisma
model Strategy {
  id          String   @id @default(uuid())
  name        String
  type        String
  config      Json
  isActive    Boolean  @default(false)
  performance Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

# 2. Generar migración y tipos
make db-migrate
make db-generate

# 3. Generar CRUD completo
make gen-crud
# Selecciona: Strategy
# Features: todas

# 4. El generador crea:
- components/strategy/StrategyList.tsx
- components/strategy/StrategyForm.tsx
- hooks/use-strategy.ts
- services/strategy.service.ts
- pages/strategy/index.tsx
- tests automáticos

# 5. Verificar
make test
make dev
```

### 2. Modificar Feature Existente

```bash
# 1. Actualizar schema.prisma
# 2. make db-migrate
# 3. make db-generate
# 4. Los tipos se actualizan automáticamente
# 5. TypeScript te mostrará qué actualizar
```

## 🧪 Testing

### Ejecutar Tests
```bash
make test           # Una vez
make test-watch     # Modo watch
make test-coverage  # Con coverage
make test-ui        # UI interactiva
```

### Escribir Tests
Los tests se generan automáticamente con los CRUDs. Ejemplo:

```typescript
// Auto-generado por plop
import { render, screen, waitFor } from '@/test/utils';
import { TradeList } from '@/components/trade/TradeList';

describe('TradeList', () => {
  it('renders trade list', async () => {
    render(<TradeList />);
    
    await waitFor(() => {
      expect(screen.getByText('Trades')).toBeInTheDocument();
    });
  });
});
```

## 🔐 Gestión de Claves

Las API keys se almacenan encriptadas en la base de datos, NO en variables de entorno:

```typescript
// Usar el servicio de claves
const keyManager = new SecureKeyManager(db);
const apiKey = await keyManager.getKey('binance', 'api_key');

// NO hacer esto:
const apiKey = process.env.BINANCE_API_KEY; // ❌
```

## 🎨 Usando el Design System

Siempre usa componentes de `@k2600x/design-system`:

```typescript
// ✅ Correcto
import { Button, Card, Input } from '@k2600x/design-system';

// ❌ Incorrecto
import { Button } from '@mui/material';
import { Card } from 'antd';
```

## 📋 Checklist para Nuevas Features

- [ ] Modelo agregado a schema.prisma
- [ ] Migraciones ejecutadas
- [ ] CRUD generado con plop
- [ ] Tests funcionando
- [ ] Documentación actualizada
- [ ] Types correctos (sin any)
- [ ] Validación con Zod
- [ ] UI usando design-system

## 🚨 Troubleshooting

### "Cannot find module '@/lib/schemas'"
```bash
make db-generate  # Genera los schemas
```

### "Type error en Prisma Client"
```bash
make db-generate  # Regenera tipos
npm run type-check
```

### "Tests fallan"
```bash
make db-reset     # Reset DB de test
make test
```

## 💡 Tips para Claude Code

1. **Siempre usa Make**: Los comandos make garantizan consistencia
2. **Genera, no escribas**: Usa plop para nuevos componentes
3. **Trust the Types**: Si TypeScript se queja, hay un problema real
4. **Test First**: Los tests se generan automáticamente, úsalos
5. **Schemas Únicos**: Zod schemas vienen de Prisma, no los dupliques

## 🔄 Actualización Continua

Este documento se actualiza automáticamente cuando:
- Se agregan nuevos generadores a plop
- Se modifican los comandos make
- Se cambia la estructura del proyecto

Última actualización: {{current_date}}
```

## 🚦 Fase 6: Scripts de Inicialización

### 6.1 Script de Setup Inicial

Crear `scripts/setup.ts`:

```typescript
#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
};

async function setup() {
  log.info('Iniciando setup del proyecto...\n');

  // 1. Verificar dependencias
  log.info('Verificando dependencias del sistema...');
  
  try {
    execSync('docker --version', { stdio: 'ignore' });
    log.success('Docker instalado');
  } catch {
    log.error('Docker no está instalado. Por favor instálalo primero.');
    process.exit(1);
  }

  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    log.success('pnpm instalado');
  } catch {
    log.warn('pnpm no está instalado. Instalando...');
    execSync('npm install -g pnpm', { stdio: 'inherit' });
  }

  // 2. Crear estructura de directorios
  log.info('\nCreando estructura de directorios...');
  
  const dirs = [
    'src/components',
    'src/hooks',
    'src/services',
    'src/lib/schemas',
    'src/pages',
    'src/test',
    'plop-templates/components',
    'plop-templates/hooks',
    'plop-templates/services',
    'plop-templates/tests',
    'plop-templates/pages',
    'prisma',
  ];

  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      log.success(`Creado: ${dir}`);
    }
  });

  // 3. Instalar dependencias
  log.info('\nInstalando dependencias...');
  execSync('pnpm install', { stdio: 'inherit' });

  // 4. Setup base de datos
  log.info('\nConfigurando base de datos...');
  
  // Verificar si .env existe
  if (!existsSync('.env')) {
    log.warn('.env no existe. Creando desde .env.example...');
    execSync('cp .env.example .env', { stdio: 'inherit' });
    log.warn('Por favor edita .env con tu configuración real');
  }

  // 5. Inicializar Prisma
  log.info('\nInicializando Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // 6. Crear archivo de rutas
  log.info('\nCreando archivo de rutas...');
  const routesContent = `export const routes = [
  { path: '/', name: 'Dashboard', icon: 'Home' },
  { path: '/trades', name: 'Trades', icon: 'TrendingUp' },
  // PLOP_INJECT_ROUTE
];`;

  require('fs').writeFileSync('src/lib/routes.ts', routesContent);

  log.success('\n✨ Setup completado!');
  log.info('\nPróximos pasos:');
  log.info('1. Edita .env con tu configuración');
  log.info('2. Ejecuta: make db-up');
  log.info('3. Ejecuta: make db-migrate');
  log.info('4. Ejecuta: make dev');
}

setup().catch(error => {
  log.error(`Error durante setup: ${error.message}`);
  process.exit(1);
});
```

### 6.2 Seed de Base de Datos

Crear `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear usuario de prueba
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  console.log('✓ Usuario creado:', user.email);

  // Crear configuraciones de trading
  const configs = [
    { key: 'trading.mode', value: 'paper' },
    { key: 'trading.max_position_size', value: 1000 },
    { key: 'trading.risk_per_trade', value: 0.02 },
    { key: 'trading.stop_loss_percentage', value: 0.05 },
  ];

  for (const config of configs) {
    await prisma.tradingConfig.upsert({
      where: {
        userId_configKey: {
          userId: user.id,
          configKey: config.key,
        },
      },
      update: {},
      create: {
        userId: user.id,
        configKey: config.key,
        configValue: config.value,
      },
    });
  }

  console.log('✓ Configuraciones creadas');

  // Crear trades de ejemplo
  const trades = [];
  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
  const exchanges = ['binance', 'coinbase'];
  const actions = ['BUY', 'SELL'];
  const statuses = ['EXECUTED', 'PENDING', 'CANCELLED'];

  for (let i = 0; i < 50; i++) {
    trades.push({
      userId: user.id,
      symbol: faker.helpers.arrayElement(symbols),
      action: faker.helpers.arrayElement(actions),
      amount: faker.number.float({ min: 0.001, max: 10, precision: 0.0001 }),
      price: faker.number.float({ min: 100, max: 50000, precision: 0.01 }),
      exchange: faker.helpers.arrayElement(exchanges),
      status: faker.helpers.arrayElement(statuses),
      executedAt: faker.date.recent({ days: 30 }),
      fees: faker.number.float({ min: 0, max: 10, precision: 0.01 }),
      profit: faker.number.float({ min: -100, max: 100, precision: 0.01 }),
    });
  }

  await prisma.trade.createMany({ data: trades });

  console.log('✓ 50 trades creados');

  // Crear datos de mercado
  const marketData = [];
  const timeframes = ['1m', '5m', '1h', '1d'];
  const now = new Date();

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      for (let i = 0; i < 100; i++) {
        const close = faker.number.float({ min: 1000, max: 50000 });
        const high = close * faker.number.float({ min: 1, max: 1.05 });
        const low = close * faker.number.float({ min: 0.95, max: 1 });
        const open = faker.number.float({ min: low, max: high });

        marketData.push({
          symbol,
          timeframe,
          open,
          high,
          low,
          close,
          volume: faker.number.float({ min: 100, max: 10000 }),
          timestamp: new Date(now.getTime() - i * 60000), // 1 minuto atrás por cada registro
        });
      }
    }
  }

  await prisma.marketData.createMany({ data: marketData });

  console.log(`✓ ${marketData.length} registros de mercado creados`);

  console.log('\n✨ Seed completado!');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 🎯 Fase 7: Integración y Testing

### 7.1 Configurar GitHub Actions

Crear `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate Prisma Client
        run: pnpm prisma generate

      - name: Run migrations
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

      - name: Run tests
        run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint
```

## 📝 Resumen de Implementación

### Orden de Ejecución para Claude Code:

1. **Setup Inicial** (30 min)
   ```bash
   pnpm install          # Instalar todas las dependencias
   npx tsx scripts/setup.ts  # Ejecutar setup automático
   make setup            # Setup completo con DB
   ```

2. **Verificar Funcionamiento** (10 min)
   ```bash
   make db-studio        # Ver base de datos
   make dev             # Iniciar desarrollo
   make test            # Ejecutar tests
   ```

3. **Generar Primer CRUD** (5 min)
   ```bash
   make gen-crud        # Seleccionar "Trade"
   make dev             # Ver resultado en http://localhost:3000/trades
   ```

4. **Documentar** (10 min)
   - Actualizar README con nuevos comandos
   - Agregar ejemplos de uso
   - Documentar decisiones de arquitectura

### Beneficios Logrados:

1. **Velocidad**: Generar CRUD completo en 30 segundos
2. **Consistencia**: Todos los componentes siguen el mismo patrón
3. **Type-Safety**: End-to-end desde DB hasta UI
4. **Testing**: Tests automáticos para todo
5. **Mantenibilidad**: Un solo lugar para cambiar patrones

### Métricas de Éxito:

- ⏱️ Tiempo para nueva feature: 5 min vs 2 horas
- 🐛 Bugs por feature: ~0 (validación automática)
- 📏 Líneas de código manual: -80%
- ✅ Coverage de tests: >80%
- 🎨 Consistencia UI: 100%

## 🚀 Próximos Pasos

1. Implementar este sistema base
2. Generar los CRUDs principales (Trade, Strategy, Integration)
3. Agregar lógica de negocio específica
4. Expandir con más generadores según patrones emergentes

¡Con este stack, el desarrollo del trading bot será rápido, consistente y mantenible!