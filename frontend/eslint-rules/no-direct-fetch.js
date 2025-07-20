/**
 * ESLint rule to prevent direct fetch() usage in service files
 * All service files must use the centralized api instance
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct fetch() usage in service files. Use the centralized api instance instead.',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noDirectFetch: 'Do not use fetch() directly in service files. Import and use the api instance from "./api" instead.',
      noXMLHttpRequest: 'Do not use XMLHttpRequest in service files. Import and use the api instance from "./api" instead.',
      missingApiImport: 'Service files must import the api instance from "./api".',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();
    const isServiceFile = filename.includes('/services/') && filename.endsWith('Service.ts');
    
    if (!isServiceFile) {
      return {};
    }

    let hasApiImport = false;

    return {
      // Check for api import
      ImportDeclaration(node) {
        if (node.source.value === './api' || node.source.value === '../api') {
          const hasDefaultImport = node.specifiers.some(spec => 
            spec.type === 'ImportDefaultSpecifier' && spec.local.name === 'api'
          );
          const hasNamedImport = node.specifiers.some(spec => 
            spec.type === 'ImportSpecifier' && spec.imported.name === 'api'
          );
          if (hasDefaultImport || hasNamedImport) {
            hasApiImport = true;
          }
        }
      },

      // Check for fetch usage
      CallExpression(node) {
        if (node.callee.name === 'fetch') {
          context.report({
            node,
            messageId: 'noDirectFetch',
          });
        }
      },

      // Check for XMLHttpRequest
      NewExpression(node) {
        if (node.callee.name === 'XMLHttpRequest') {
          context.report({
            node,
            messageId: 'noXMLHttpRequest',
          });
        }
      },

      // Check that api is imported at the end of the file
      'Program:exit'() {
        if (!hasApiImport) {
          context.report({
            node: context.getSourceCode().ast,
            messageId: 'missingApiImport',
          });
        }
      },
    };
  },
};