# Automated Development Stack - Testing Documentation

## Overview

Comprehensive test suite for the CRUD generation system to ensure reliability and prevent regressions.

## Test Structure

```
tests/generator/
├── fixtures/
│   └── test-schema.prisma          # Test schema with various model types
├── parsePrismaModel.unit.test.mjs  # Unit tests for schema parsing
├── templateValidation.test.mjs     # Template compilation tests  
├── regression.test.mjs             # Tests for previously fixed bugs
├── generateCrud.integration.test.mjs # Full generation integration tests
└── runAllTests.mjs                 # Master test runner

# Cleanup/debug scripts
├── debug-templates.mjs             # Debug template output
├── debug-frontend-types.mjs        # Debug frontend type generation
├── debug-similar.mjs               # Debug model name suggestions
└── parsePrismaModel.test.js        # Alternative test approach (deprecated)
```

## Test Categories

### 1. Unit Tests - parsePrismaModel (`test:generator`)

Tests the core Prisma schema parsing functionality:
- Basic model parsing with various field types
- Relations (one-to-many, many-to-one)
- Different schemas (public, trading, financial)
- Complex field types (Json, DateTime, optional fields)
- Error handling and model name suggestions

**Run**: `npm run test:generator`

### 2. Template Validation Tests (`test:generator:templates`)

Validates all Handlebars templates compile correctly:
- Frontend type generation
- Form components with proper field handling
- List components with correct table columns
- Backend types with Zod schemas
- Dynamic route validation
- Service SQL generation

**Run**: `npm run test:generator:templates`

### 3. Regression Tests (`test:generator:regression`)

Ensures previously fixed issues don't reoccur:
- Issue #1: Frontend types using modelInfo correctly
- Issue #2: CreateModel including fields with defaults
- Issue #3: PageHeader using correct prop names
- Issue #4: Type casting in list components
- Issue #5: Default value parsing (uuid(), strings, etc.)
- Issue #6: Similar model name suggestions

**Run**: `npm run test:generator:regression`

### 4. Integration Tests (`test:generator:integration`)

Full end-to-end CRUD generation tests:
- Complete CRUD generation for test models
- Schema-specific generation (trading, financial)
- Feature selection (only specific components)
- Complex model handling (relations, Json fields)
- File creation verification

**Run**: `npm run test:generator:integration`

⚠️ **Note**: Integration tests create actual files and should be run with caution.

## Running Tests

### Individual Test Suites
```bash
npm run test:generator              # Unit tests only
npm run test:generator:templates    # Template validation
npm run test:generator:regression   # Regression tests
npm run test:generator:integration  # Integration tests (creates files!)
```

### All Tests
```bash
npm run test:generator:all          # All tests except integration
node tests/generator/runAllTests.mjs # All tests including integration
node tests/generator/runAllTests.mjs --no-integration # Skip integration
```

## Test Schema

The test schema (`fixtures/test-schema.prisma`) includes:
- **TestModel**: Simple model with basic fields
- **TestUser/TestPost**: Models with relations
- **TestTrade**: Model in different schema (trading)
- **TestAlert**: Complex model with Json fields and defaults

## Key Improvements Made

### 1. Accurate Field Parsing
- Fixed regex to handle function defaults like `uuid()`
- Proper handling of string defaults with quotes
- Correct identification of optional vs required fields

### 2. Dynamic Template Generation
- Templates now use `modelInfo` from parsed schema
- No more hardcoded generic fields
- Proper handling of all Prisma field types

### 3. Type Safety
- Fixed TypeScript type errors in generated code
- Proper type casting for event handlers
- Correct optional field marking

### 4. Error Messages
- Levenshtein distance for model name suggestions
- Clear error messages with helpful hints
- Better debugging information

## Adding New Tests

### 1. Add to Test Schema
```prisma
model NewTestModel {
  id          String   @id @default(uuid())
  customField String   @unique
  // ... other fields
  
  @@schema("public")
}
```

### 2. Create Test Case
```javascript
await test('should handle new feature', async () => {
  const result = await parsePrismaModel('NewTestModel', testSchemaPath);
  // Add assertions
});
```

### 3. Update Test Runner
Add new test file to `runAllTests.mjs` if creating a new test category.

## CI Integration

To add to CI pipeline:
```yaml
- name: Run Generator Tests
  run: npm run test:generator:all
```

## Debugging

Use the debug scripts for troubleshooting:
```bash
node tests/generator/debug-templates.mjs      # Check template output
node tests/generator/debug-frontend-types.mjs # Check type generation
```

## Future Improvements

1. **Performance Tests**: Measure generation speed for large schemas
2. **Edge Case Tests**: Unicode names, reserved keywords, etc.
3. **Migration Tests**: Ensure generated code survives schema changes
4. **Snapshot Tests**: Compare generated output against known-good versions
5. **Coverage Reports**: Add code coverage metrics

## Summary

The test suite ensures the CRUD generator produces correct, compilable code for any valid Prisma model. All identified issues have regression tests to prevent reoccurrence.