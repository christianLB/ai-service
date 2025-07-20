# AI Service Frontend

This is the React + TypeScript + Vite frontend for the AI Service platform.

## 🚨 Important: Service Development Requirements

**All API services MUST use the centralized `api` instance for authentication to work correctly.**

See [Service Development Guide](./docs/SERVICE_DEVELOPMENT_GUIDE.md) for mandatory patterns and practices.

### Quick Checklist for Services:
- ✅ Import `api` from `'./api'`
- ✅ Use `api.get()`, `api.post()`, etc. for ALL requests
- ❌ NEVER use `fetch()` or `XMLHttpRequest`
- ❌ NEVER manually add authentication headers
- ❌ NEVER handle 401 errors (api instance handles them)

## Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Ant Design** for UI components
- **React Query** for data fetching
- **React Router** for navigation

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
