FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Avoid Git hooks during CI/container builds
ENV HUSKY=0 CI=true NPM_CONFIG_FUND=false

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY packages ./packages
COPY apps/api-gateway ./apps/api-gateway

# Install deps at root to leverage workspace (avoid running root scripts)
RUN pnpm install --frozen-lockfile

# Build shared packages and gateway (ensure contracts are built)
RUN pnpm --filter @ai/config build \
 && pnpm --filter @ai/contracts build \
 && pnpm --filter api-gateway build

# Create a self-contained deploy directory without workspace symlinks
RUN mkdir -p ./apps/api-gateway/deploy \
 && pnpm --filter api-gateway deploy ./apps/api-gateway/deploy --prod --legacy

# --- Runtime image (slim, self-contained) ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/api-gateway/deploy

# Copy only the deployed artifact
COPY --from=base /app/apps/api-gateway/deploy .

CMD ["node", "dist/index.js"]
