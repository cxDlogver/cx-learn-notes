FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && \
    pnpm exec tsc -p packages/contracts/tsconfig.json && \
    pnpm exec tsc -p packages/domain/tsconfig.json && \
    pnpm exec tsc -p packages/design-tokens/tsconfig.json && \
    pnpm --filter @plan-checkin/web build

FROM node:22-bookworm-slim
ENV NODE_ENV=production WEB_PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/web/dist /app/dist
COPY --from=build --chown=node:node /workspace/apps/web/server.mjs /app/server.mjs
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
