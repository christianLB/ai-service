const path = require('path');

module.exports = function (plop) {
  // Helpers personalizados
  plop.setHelper('eq', (a, b) => a === b);
  plop.setHelper('includes', (array, item) => {
    if (typeof array === 'string') {
      return array.includes(item);
    }
    return array?.includes(item);
  });
  plop.setHelper('capitalize', (str) => str.charAt(0).toUpperCase() + str.slice(1));
  plop.setHelper('titleCase', (str) => str.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '));
  plop.setHelper('or', (a, b) => a || b);
  plop.setHelper('and', (a, b) => a && b);
  plop.setHelper('not', (a) => !a);
  plop.setHelper('currency', (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  });
  
  // Helper to convert Prisma type to Zod type
  plop.setHelper('prismaToZod', (field) => {
    if (!field) return 'z.any()';
    
    let zodType = 'z.any()';
    
    // Map Prisma types to Zod types
    const typeMap = {
      'String': 'z.string()',
      'Int': 'z.number().int()',
      'Float': 'z.number()',
      'Boolean': 'z.boolean()',
      'DateTime': 'z.date()',
      'Json': 'z.any()',
      'Decimal': 'z.number()',
      'BigInt': 'z.bigint()',
      'Bytes': 'z.any()'
    };
    
    zodType = typeMap[field.type] || 'z.string()';
    
    // Add UUID validation for ID fields
    if (field.name.toLowerCase().includes('id') && field.type === 'String') {
      zodType = 'z.string().uuid()';
    }
    
    // Add email validation
    if (field.name.toLowerCase() === 'email') {
      zodType = 'z.string().email()';
    }
    
    // Handle arrays
    if (field.isArray) {
      zodType = `z.array(${zodType})`;
    }
    
    // Handle optional fields
    if (field.isOptional) {
      zodType += '.optional()';
      if (!field.hasDefault) {
        zodType += '.nullable()';
      }
    }
    
    // Handle defaults
    if (field.hasDefault) {
      if (field.defaultValue === 'false' || field.defaultValue === 'true') {
        zodType += `.default(${field.defaultValue})`;
      } else if (field.defaultValue && field.defaultValue.match(/^['"].*['"]$/)) {
        // String default - already has quotes
        zodType += `.default(${field.defaultValue})`;
      } else if (field.defaultValue && !field.defaultValue.includes('(')) {
        // Other defaults like numbers
        zodType += `.default(${field.defaultValue})`;
      }
    }
    
    return zodType;
  });
  
  // Partials reutilizables
  plop.setPartial('imports', `import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';`);

  plop.setPartial('antdImports', `import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Spin,
  Tag,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';`);

  // Generador CRUD completo
  plop.setGenerator('crud', {
    description: 'Genera CRUD completo para un modelo Prisma',
    prompts: [
      {
        type: 'input',
        name: 'model',
        message: 'Nombre del modelo Prisma (ej: Client, Invoice):',
        validate: (input) => /^[A-Z][a-zA-Z]*$/.test(input) || 'Debe empezar con mayúscula'
      },
      {
        type: 'input',
        name: 'schema',
        message: 'Schema de la base de datos (ej: financial, trading, o deja vacío para root):',
        default: ''
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Selecciona las features a generar:',
        choices: [
          { name: 'Lista con paginación y búsqueda', value: 'list', checked: true },
          { name: 'Formulario Create/Edit', value: 'form', checked: true },
          { name: 'Vista detalle', value: 'detail', checked: true },
          { name: 'API Routes (backend)', value: 'api', checked: true },
          { name: 'Service Layer', value: 'service', checked: true },
          { name: 'Hooks personalizados', value: 'hooks', checked: true },
          { name: 'Tests', value: 'tests', checked: false }
        ]
      },
      {
        type: 'confirm',
        name: 'hasRelations',
        message: '¿El modelo tiene relaciones con otros modelos?',
        default: false
      }
    ],
    actions: (data) => {
      const actions = [];
      
      // Siempre generar tipos TypeScript
      // Use dynamic template if modelInfo is available
      actions.push({
        type: 'add',
        path: 'src/types/{{kebabCase model}}.types.ts',
        templateFile: data.modelInfo 
          ? 'plop-templates/types/model.types.dynamic.ts.hbs'
          : 'plop-templates/types/model.types.ts.hbs'
      });

      // Generate frontend types too
      actions.push({
        type: 'add',
        path: 'frontend/src/types/{{kebabCase model}}.types.ts',
        templateFile: 'plop-templates/types/model.types.frontend.ts.hbs'
      });

      // Service layer
      if (data.features.includes('service')) {
        actions.push({
          type: 'add',
          path: 'src/services/{{kebabCase model}}.service.ts',
          templateFile: 'plop-templates/services/model.service.ts.hbs'
        });
      }

      // API routes
      if (data.features.includes('api')) {
        actions.push({
          type: 'add',
          path: 'src/routes/{{kebabCase model}}.routes.ts',
          templateFile: data.modelInfo 
            ? 'plop-templates/routes/model.routes.dynamic.ts.hbs'
            : 'plop-templates/routes/model.routes.ts.hbs'
        });
      }

      // Frontend hooks
      if (data.features.includes('hooks')) {
        actions.push({
          type: 'add',
          path: 'frontend/src/hooks/use-{{kebabCase model}}.ts',
          templateFile: 'plop-templates/hooks/use-model.ts.hbs'
        });
      }

      // Frontend components
      if (data.features.includes('list')) {
        actions.push({
          type: 'add',
          path: 'frontend/src/components/{{kebabCase model}}/{{pascalCase model}}List.tsx',
          templateFile: data.modelInfo 
            ? 'plop-templates/components/model-list-dynamic.tsx.hbs'
            : 'plop-templates/components/model-list.tsx.hbs'
        });
      }

      if (data.features.includes('form')) {
        actions.push({
          type: 'add',
          path: 'frontend/src/components/{{kebabCase model}}/{{pascalCase model}}Form.tsx',
          templateFile: data.modelInfo 
            ? 'plop-templates/components/model-form-simple.tsx.hbs'
            : 'plop-templates/components/model-form.tsx.hbs'
        });
      }

      if (data.features.includes('detail')) {
        actions.push({
          type: 'add',
          path: 'frontend/src/components/{{kebabCase model}}/{{pascalCase model}}Detail.tsx',
          templateFile: data.modelInfo 
            ? 'plop-templates/components/model-detail-dynamic.tsx.hbs'
            : 'plop-templates/components/model-detail.tsx.hbs'
        });
      }

      // Tests
      if (data.features.includes('tests')) {
        actions.push({
          type: 'add',
          path: 'src/services/__tests__/{{kebabCase model}}.service.test.ts',
          templateFile: 'plop-templates/tests/service.test.ts.hbs'
        });
        
        actions.push({
          type: 'add',
          path: 'frontend/src/components/{{kebabCase model}}/__tests__/{{pascalCase model}}List.test.tsx',
          templateFile: 'plop-templates/tests/component.test.tsx.hbs'
        });
      }

      // Frontend page
      actions.push({
        type: 'add',
        path: 'frontend/src/pages/{{kebabCase model}}/index.tsx',
        templateFile: 'plop-templates/pages/model-page.tsx.hbs'
      });

      // Update routes in backend
      if (data.features.includes('api')) {
        actions.push({
          type: 'modify',
          path: 'src/index.ts',
          pattern: /(\/\/ PLOP_INJECT_ROUTE)/g,
          template: `app.use('/api/{{kebabCase model}}s', {{camelCase model}}Routes);\n$1`
        });
        
        actions.push({
          type: 'modify',
          path: 'src/index.ts',
          pattern: /(\/\/ PLOP_INJECT_IMPORT)/g,
          template: `import {{camelCase model}}Routes from './routes/{{kebabCase model}}.routes';\n$1`
        });
      }

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
        message: 'Nombre del servicio (ej: Analytics, Reporting):'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Tipo de servicio:',
        choices: ['database', 'external-api', 'business-logic', 'utility']
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
          { name: 'search', value: 'search', checked: false },
          { name: 'bulkCreate', value: 'bulkCreate', checked: false },
          { name: 'bulkDelete', value: 'bulkDelete', checked: false }
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

  // Generador de hooks personalizados para frontend
  plop.setGenerator('hook', {
    description: 'Genera un hook personalizado para React',
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
        choices: [
          { name: 'Data Fetching (React Query)', value: 'data-fetching' },
          { name: 'State Management', value: 'state-management' },
          { name: 'Side Effects', value: 'side-effects' },
          { name: 'Utility/Helper', value: 'utility' }
        ]
      },
      {
        type: 'confirm',
        name: 'needsApi',
        message: '¿Necesita comunicarse con la API?',
        default: true,
        when: (answers) => answers.type === 'data-fetching'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'frontend/src/hooks/use-{{kebabCase name}}.ts',
        templateFile: 'plop-templates/hooks/hook-{{type}}.ts.hbs'
      },
      {
        type: 'add',
        path: 'frontend/src/hooks/__tests__/use-{{kebabCase name}}.test.ts',
        templateFile: 'plop-templates/tests/hook.test.ts.hbs'
      }
    ]
  });

  // Generador de componentes UI
  plop.setGenerator('component', {
    description: 'Genera un componente React reutilizable',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del componente (ej: UserCard, DataChart):'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Tipo de componente:',
        choices: [
          { name: 'Presentational (sin estado)', value: 'presentational' },
          { name: 'Container (con estado)', value: 'container' },
          { name: 'Form', value: 'form' },
          { name: 'Chart/Visualization', value: 'chart' },
          { name: 'Layout', value: 'layout' }
        ]
      },
      {
        type: 'confirm',
        name: 'hasStyles',
        message: '¿Necesita estilos CSS?',
        default: true
      },
      {
        type: 'confirm',
        name: 'hasTests',
        message: '¿Generar tests?',
        default: true
      }
    ],
    actions: (data) => {
      const actions = [];

      // Componente principal
      actions.push({
        type: 'add',
        path: 'frontend/src/components/{{kebabCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'plop-templates/components/component-{{type}}.tsx.hbs'
      });

      // Index barrel file
      actions.push({
        type: 'add',
        path: 'frontend/src/components/{{kebabCase name}}/index.ts',
        template: `export { {{pascalCase name}} } from './{{pascalCase name}}';
export type { {{pascalCase name}}Props } from './{{pascalCase name}}';`
      });

      // Estilos
      if (data.hasStyles) {
        actions.push({
          type: 'add',
          path: 'frontend/src/components/{{kebabCase name}}/{{pascalCase name}}.module.css',
          templateFile: 'plop-templates/styles/component.module.css.hbs'
        });
      }

      // Tests
      if (data.hasTests) {
        actions.push({
          type: 'add',
          path: 'frontend/src/components/{{kebabCase name}}/__tests__/{{pascalCase name}}.test.tsx',
          templateFile: 'plop-templates/tests/component.test.tsx.hbs'
        });
      }

      return actions;
    }
  });

  // Generador de módulos completos
  plop.setGenerator('module', {
    description: 'Genera un módulo completo con frontend y backend',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del módulo (ej: Reports, Analytics):'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Descripción breve del módulo:'
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Features del módulo:',
        choices: [
          { name: 'Dashboard/Overview', value: 'dashboard', checked: true },
          { name: 'CRUD Operations', value: 'crud', checked: true },
          { name: 'Reports/Export', value: 'reports', checked: false },
          { name: 'Real-time updates', value: 'realtime', checked: false },
          { name: 'File uploads', value: 'uploads', checked: false },
          { name: 'Notifications', value: 'notifications', checked: false }
        ]
      }
    ],
    actions: (data) => {
      const actions = [];

      // Backend structure
      actions.push({
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/index.ts',
        template: `// {{titleCase name}} Module
// {{description}}

export * from './{{kebabCase name}}.service';
export * from './{{kebabCase name}}.controller';
export * from './{{kebabCase name}}.routes';`
      });

      actions.push({
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/{{kebabCase name}}.service.ts',
        templateFile: 'plop-templates/modules/service.ts.hbs'
      });

      actions.push({
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/{{kebabCase name}}.controller.ts',
        templateFile: 'plop-templates/modules/controller.ts.hbs'
      });

      actions.push({
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/{{kebabCase name}}.routes.ts',
        templateFile: 'plop-templates/modules/routes.ts.hbs'
      });

      // Frontend structure
      if (data.features.includes('dashboard')) {
        actions.push({
          type: 'add',
          path: 'frontend/src/modules/{{kebabCase name}}/Dashboard.tsx',
          templateFile: 'plop-templates/modules/dashboard.tsx.hbs'
        });
      }

      // Module configuration
      actions.push({
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/config.ts',
        template: `export const {{constantCase name}}_CONFIG = {
  name: '{{titleCase name}}',
  description: '{{description}}',
  version: '1.0.0',
  features: {{json features}},
  permissions: [
    '{{kebabCase name}}.read',
    '{{kebabCase name}}.write',
    '{{kebabCase name}}.delete',
    '{{kebabCase name}}.admin'
  ]
};`
      });

      return actions;
    }
  });
};