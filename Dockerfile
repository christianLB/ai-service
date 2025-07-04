# Multi-stage Dockerfile para AI Service
FROM node:20-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Stage de desarrollo
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
USER node
CMD ["dumb-init", "npm", "run", "dev"]

# Stage de construcción
FROM base AS builder
RUN npm ci

# Copiar archivos del proyecto
COPY . .

# Instalar dependencias del frontend y construir
RUN cd frontend && npm ci && cd ..
RUN npm run build

# Stage de producción
FROM base AS production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copiar archivos construidos
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Copiar entrypoint script
COPY --chown=nodejs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Crear directorios necesarios
RUN mkdir -p logs workflows data/documents/storage data/documents/temp data/documents/thumbnails data/knowledge data/workflows/storage && \
    chown -R nodejs:nodejs logs workflows data

# Configurar usuario
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/status || exit 1

# Comando de inicio
ENTRYPOINT ["dumb-init", "./entrypoint.sh"]