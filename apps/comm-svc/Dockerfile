FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY packages ./packages
COPY apps/comm-svc ./apps/comm-svc

# Install deps at root to leverage workspace
RUN pnpm install --frozen-lockfile

# Build shared config and the service
RUN pnpm --filter @ai/config build && pnpm --filter comm-svc build

# Create a self-contained deploy directory without workspace symlinks
RUN mkdir -p ./apps/comm-svc/deploy \
 && pnpm --filter comm-svc deploy ./apps/comm-svc/deploy --prod --legacy

# --- Runtime image (slim, self-contained) ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/comm-svc/deploy

# Copy only the deployed artifact
COPY --from=base /app/apps/comm-svc/deploy .

CMD ["node", "dist/index.js"]
