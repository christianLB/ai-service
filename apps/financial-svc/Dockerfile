FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/financial-svc ./apps/financial-svc

# Install deps at root to leverage workspace
RUN pnpm install --frozen-lockfile

# Build shared config and the service
RUN pnpm --filter @ai/config build && pnpm --filter financial-svc build

# Create a self-contained deploy directory without workspace symlinks
RUN mkdir -p ./apps/financial-svc/deploy \
 && pnpm --filter financial-svc deploy ./apps/financial-svc/deploy --prod --legacy

# --- Runtime image (slim, self-contained) ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/financial-svc/deploy

# Copy only the deployed artifact
COPY --from=base /app/apps/financial-svc/deploy .

CMD ["node", "dist/index.js"]
