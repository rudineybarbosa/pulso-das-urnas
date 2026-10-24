FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/ingest/package.json apps/ingest/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/geo/package.json packages/geo/package.json
COPY packages/tse/package.json packages/tse/package.json
COPY packages/cloud/package.json packages/cloud/package.json
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 8787
CMD ["pnpm", "--filter", "@pulso/api", "start"]
