FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec tsc -p packages/contracts/tsconfig.json && \
    pnpm exec tsc -p packages/domain/tsconfig.json && \
    pnpm exec tsc -p apps/api/tsconfig.json && \
    pnpm exec tsc -p apps/worker/tsconfig.json

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=build --chown=node:node /workspace /workspace
USER node
CMD ["node", "apps/api/dist/main.js"]
