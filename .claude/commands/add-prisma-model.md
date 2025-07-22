# Add Prisma Model

This command helps add new database models with proper migrations and CRUD generation.

## Usage
```
/add-prisma-model [ModelName] [schema=financial|public]
```

## Steps

1. **Add model to schema.prisma**:
   ```prisma
   model [ModelName] {
     id          String    @id @default(uuid())
     userId      String    @map("user_id") @db.Uuid
     name        String    @db.VarChar(255)
     description String?   @db.Text
     status      String    @default("active") @db.VarChar(50)
     metadata    Json?     @default("{}")
     createdAt   DateTime  @default(now()) @map("created_at")
     updatedAt   DateTime  @updatedAt @map("updated_at")
     
     // Relations
     user        users     @relation(fields: [userId], references: [id])
     
     @@map("[table_name]")  // Use snake_case
     @@schema("[schema]")    // financial or public
   }
   ```

2. **Generate Prisma client**:
   ```bash
   make db-generate
   ```

3. **Create migration**:
   ```bash
   make db-migrate-create NAME=add_[model_name]_table
   ```

4. **Apply migration**:
   ```bash
   make db-migrate
   ```

5. **Generate CRUD automatically**:
   ```bash
   make gen-crud-auto MODEL=[ModelName]
   ```

## Common Field Types

### String fields
```prisma
name        String    @db.VarChar(255)
description String?   @db.Text
code        String    @unique @db.VarChar(50)
```

### Numeric fields
```prisma
amount      Decimal   @db.Decimal(15, 2)
quantity    Int       @default(0)
percentage  Float     @default(0.0)
```

### Date fields
```prisma
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
deletedAt   DateTime?
validFrom   DateTime  @map("valid_from")
validUntil  DateTime? @map("valid_until")
```

### Relations
```prisma
// One-to-many
userId      String    @map("user_id") @db.Uuid
user        users     @relation(fields: [userId], references: [id])

// Many-to-many (create join table)
model ModelCategories {
  modelId     String @map("model_id") @db.Uuid
  categoryId  String @map("category_id") @db.Uuid
  
  model       Model    @relation(fields: [modelId], references: [id])
  category    Category @relation(fields: [categoryId], references: [id])
  
  @@id([modelId, categoryId])
  @@schema("financial")
}
```

## Best Practices

1. **Naming conventions**:
   - Models: PascalCase (e.g., `UserProfile`)
   - Table names: snake_case with @@map (e.g., `user_profiles`)
   - Fields: camelCase in model, snake_case in DB with @map

2. **Always include**:
   - `id` field with UUID
   - `createdAt` and `updatedAt` timestamps
   - Proper schema assignment (@@schema)
   - User relation if user-scoped

3. **Security considerations**:
   - Add indexes for frequently queried fields
   - Use unique constraints where appropriate
   - Consider soft deletes (deletedAt field)

## Example: Adding a Product model

```prisma
model Product {
  id          String    @id @default(uuid())
  userId      String    @map("user_id") @db.Uuid
  name        String    @db.VarChar(255)
  description String?   @db.Text
  price       Decimal   @db.Decimal(10, 2)
  currency    String    @default("EUR") @db.VarChar(3)
  stock       Int       @default(0)
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  user        users     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@map("products")
  @@schema("financial")
}
```

Then run:
```bash
make db-generate
make db-migrate-create NAME=add_products_table
make db-migrate
make gen-crud-auto MODEL=Product
```