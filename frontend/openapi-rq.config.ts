import { defineConfig } from '@7nohe/openapi-react-query-codegen';

export default defineConfig({
  // Use the financial OpenAPI spec
  input: '../openapi/financial.yaml',
  output: {
    path: './src/generated/hooks',
    clean: true,
  },
  // Start with axios client for simplicity
  client: 'axios',
});