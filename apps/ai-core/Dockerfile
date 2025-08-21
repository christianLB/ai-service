FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY packages ./packages
COPY apps/ai-core ./apps/ai-core

# Install deps at root to leverage workspace
RUN pnpm install --frozen-lockfile

# Build shared config and the service
RUN pnpm --filter @ai/observability build && pnpm --filter @ai/config build && pnpm --filter ai-core build

# Create a self-contained deploy directory without workspace symlinks
RUN mkdir -p ./apps/ai-core/deploy \
 && pnpm --filter ai-core deploy ./apps/ai-core/deploy --prod --legacy

# --- Runtime image (slim, self-contained) ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/ai-core/deploy

# Copy only the deployed artifact
COPY --from=base /app/apps/ai-core/deploy .
# Install runtime dependencies for entrypoint
RUN apk add --no-cache netcat-openbsd
# Copy entrypoint script and make it executable
COPY apps/ai-core/entrypoint.sh /app/apps/ai-core/deploy/entrypoint.sh
RUN chmod +x /app/apps/ai-core/deploy/entrypoint.sh

CMD ["/app/apps/ai-core/deploy/entrypoint.sh"]
