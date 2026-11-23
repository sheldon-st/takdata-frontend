# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Keep in sync with package.json "packageManager"
ARG PNPM_VERSION=11.21.0
RUN npm install -g pnpm@${PNPM_VERSION}

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time.
# Empty API base URL = same-origin requests, which is what a single-host
# deploy (UI at /, API at /api) wants.
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_SIGN_OUT_URL=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SIGN_OUT_URL=$NEXT_PUBLIC_SIGN_OUT_URL \
    NODE_ENV=production

RUN pnpm build

# ── Stage 3: minimal runtime image ───────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
# standalone output is a self-contained Node server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "server.js"]
