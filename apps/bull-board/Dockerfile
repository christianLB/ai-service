# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy package files for all workspace packages
COPY packages/config/package.json ./packages/config/
COPY packages/observability/package.json ./packages/observability/
COPY apps/bull-board/package.json ./apps/bull-board/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/config ./packages/config
COPY packages/observability ./packages/observability
COPY apps/bull-board ./apps/bull-board
COPY tsconfig.json ./

# Build packages and app
RUN pnpm --filter @ai/config build && \
    pnpm --filter @ai/observability build && \
    pnpm --filter @ai/bull-board build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy built packages and app
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/bull-board ./apps/bull-board

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3200

# Start the application
CMD ["node", "apps/bull-board/dist/index.js"]