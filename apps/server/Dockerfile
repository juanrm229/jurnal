# Server API Sehari. Bangun dari root monorepo:
#   docker build -f apps/server/Dockerfile -t sehari-server .
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/doodles/package.json packages/doodles/
COPY apps/server/package.json apps/server/
RUN npm ci --workspace @sehari/server --include-workspace-root --omit=dev --ignore-scripts \
 && npm install --no-save --workspace @sehari/server tsx

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages ./packages
COPY apps/server ./apps/server
WORKDIR /app/apps/server
EXPOSE 8787
CMD ["npx", "tsx", "src/main.ts"]
