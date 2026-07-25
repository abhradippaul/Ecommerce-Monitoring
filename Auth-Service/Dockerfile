FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable


FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build


FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
RUN mkdir -p logs && chown -R node:node logs

COPY --from=builder /app/src/protos ./src/protos
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3002

CMD ["node", "dist/index.js"]