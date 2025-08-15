FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Avoid Git hooks during CI/container builds
ENV HUSKY=0 CI=true NPM_CONFIG_FUND=false

# System deps required for Prisma on Alpine (openssl, libc compat)
RUN apk add --no-cache openssl libc6-compat

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/financial-svc ./apps/financial-svc
COPY apps/financial-svc/entrypoint.sh ./apps/financial-svc/entrypoint.sh

# Install deps at root to leverage workspace
RUN pnpm install --frozen-lockfile

# Build shared packages and the service (ensure contracts are built)
RUN pnpm --filter @ai/config build \
 && pnpm --filter @ai/contracts build \
 && pnpm --filter ./apps/financial-svc build

# Create a self-contained deploy directory without workspace symlinks
RUN mkdir -p ./apps/financial-svc/deploy \
 && pnpm --filter ./apps/financial-svc deploy ./apps/financial-svc/deploy --prod --legacy
RUN cp ./apps/financial-svc/entrypoint.sh ./apps/financial-svc/deploy/entrypoint.sh \
 && chmod +x ./apps/financial-svc/deploy/entrypoint.sh

# --- Runtime image (slim, self-contained) ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/financial-svc/deploy

# Runtime deps required for Prisma engines on Alpine as well
RUN apk add --no-cache openssl libc6-compat

# Copy only the deployed artifact
COPY --from=base /app/apps/financial-svc/deploy .
COPY --from=base /app/prisma /app/prisma

ENTRYPOINT ["sh", "/app/apps/financial-svc/deploy/entrypoint.sh"]
