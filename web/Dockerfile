# syntax=docker.io/docker/dockerfile:1

FROM node:24-trixie-slim AS base
RUN corepack enable pnpm

# Install all dependencies (the build needs the dev ones too)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

# Install only what the server needs at run time (dist/node/server.js keeps
# its package.json dependencies external)
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile --prod

# Build the client (dist/client) and the Node server (dist/node)
FROM base AS builder
WORKDIR /app

# NEXT_PUBLIC_* are inlined into the client bundle at build time.
# (THEME_COLOR*, SITE_NAME and SITE_DESCRIPTION are read at run time instead.)
ARG NEXT_PUBLIC_APP_VERSION=dev
ARG NEXT_PUBLIC_GOOGLE_API_KEY
ARG NEXT_PUBLIC_MAP_TYPE_IDS
ARG NEXT_PUBLIC_DEFAULT_CENTER
ARG NEXT_PUBLIC_DEFAULT_ZOOM
ARG NEXT_PUBLIC_MAP_ID
ARG NEXT_PUBLIC_SHAPE_STYLES_JSON_URL
ARG NEXT_PUBLIC_THEME_JSON_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image
FROM base AS runner
# server.ts resolves dist/client and public/uploads against the working dir
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/dist ./dist
# Default upload dir for IMAGE_STORAGE != R2; mount a volume here to keep it
RUN mkdir -p public/uploads && chown -R node:node public

USER node

EXPOSE 3000

CMD ["node", "dist/node/server.js"]
