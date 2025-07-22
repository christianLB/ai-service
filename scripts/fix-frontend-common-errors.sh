#!/bin/bash

echo "🔧 Arreglando errores comunes del frontend..."

# Fix subtitle -> subTitle en PageHeader
echo "  ✓ Corrigiendo subtitle -> subTitle"
find frontend/src -name "*.tsx" -type f -exec sed -i 's/subtitle:/subTitle:/g' {} \;

# Fix onChange para selectedRowKeys (Key[] -> string[])
echo "  ✓ Corrigiendo selectedRowKeys type casting"
find frontend/src/components -name "*List.tsx" -type f -exec sed -i 's/onChange: setSelectedRowKeys/onChange: (keys) => setSelectedRowKeys(keys as string[])/g' {} \;

# Fix imports de tipos backend en frontend
echo "  ✓ Corrigiendo imports de tipos"
find frontend/src/components -name "*.tsx" -type f -exec sed -i 's|../../../../src/types/|../../types/|g' {} \;

# Fix formatCurrency si falta el segundo parámetro
echo "  ✓ Agregando currency por defecto a formatCurrency"
find frontend/src/components -name "*.tsx" -type f -exec sed -i "s/formatCurrency(amount)/formatCurrency(amount, 'EUR')/g" {} \;

# Remove unused imports
echo "  ✓ Eliminando imports no utilizados"
# Remove unused formatCurrency if no currency fields
find frontend/src/components/alert -name "*.tsx" -type f -exec sed -i '/formatCurrency/d' {} \;
find frontend/src/components/strategy -name "*.tsx" -type f -exec sed -i '/formatCurrency/d' {} \;
find frontend/src/components/trade -name "*.tsx" -type f -exec sed -i '/formatCurrency/d' {} \;

# Remove unused Select if not used
find frontend/src/components/alert -name "AlertList.tsx" -type f -exec sed -i '/^\s*Select,$/d' {} \;
find frontend/src/components/alert -name "AlertList.tsx" -type f -exec sed -i '/^\s*Tag,$/d' {} \;

# Fix total parameter not used
echo "  ✓ Arreglando parámetro total no utilizado"
find frontend/src/components -name "*List.tsx" -type f -exec sed -i "s/showTotal: (total) => \`Total \${total} items\`/showTotal: (total: number) => \`Total \${total} items\`/g" {} \;

# Fix TextArea value type issue
echo "  ✓ Arreglando tipos de TextArea"
find frontend/src/components -name "*Form.tsx" -type f -exec sed -i 's/{...field}/{...field, value: field.value || ""}/g' {} \;

echo "✅ Correcciones aplicadas"