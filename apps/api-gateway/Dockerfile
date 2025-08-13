FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api-gateway ./apps/api-gateway

# Install deps at root to leverage workspace
RUN pnpm -w i --frozen-lockfile

# Build config and gateway
RUN pnpm -w --filter @ai/config build && pnpm -w --filter api-gateway build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy runtime files
COPY --from=base /app/apps/api-gateway/dist ./dist
COPY --from=base /app/apps/api-gateway/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
