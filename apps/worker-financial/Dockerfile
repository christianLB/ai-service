FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY packages ./packages
COPY apps/worker-financial ./apps/worker-financial
# Copy Prisma schema for future use
COPY prisma ./prisma

# Install deps at root to leverage workspace
RUN pnpm install --frozen-lockfile

# Build shared config and the service
RUN pnpm --filter @ai/config build && pnpm --filter worker-financial build

# Create a self-contained deploy directory without workspace symlinks
RUN mkdir -p ./apps/worker-financial/deploy \
 && pnpm --filter worker-financial deploy ./apps/worker-financial/deploy --prod --legacy

# --- Runtime image (slim, self-contained) ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy Prisma schema for migrations (if needed in future)
COPY --from=base /app/prisma ./prisma

# Copy deployed artifact
COPY --from=base /app/apps/worker-financial/deploy ./apps/worker-financial/deploy

# Copy and set up entrypoint
COPY apps/worker-financial/entrypoint.sh ./apps/worker-financial/entrypoint.sh
RUN chmod +x ./apps/worker-financial/entrypoint.sh

WORKDIR /app/apps/worker-financial/deploy

CMD ["/app/apps/worker-financial/entrypoint.sh"]
