# Sehari (web app + API dalam satu layanan). Untuk hosting gratis seperti Render.
#   docker build -t sehari .
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/doodles/package.json packages/doodles/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm install --workspace @sehari/server --workspace @sehari/web --include-workspace-root --ignore-scripts --no-audit --no-fund
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web ./apps/web
RUN npm run build -w @sehari/web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787 WEB_DIST=/app/apps/web/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/server
EXPOSE 8787
CMD ["node", "--import", "tsx", "src/main.ts"]
