# syntax=docker/dockerfile:1
# Build a partir da raiz do repositório: docker build -f docker/Dockerfile -t veridt-frontend .

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
# Os mocks (MSW) nunca entram na imagem de produção.
ENV VITE_ENABLE_MOCKS=false
RUN pnpm build

# ---- runtime ----
FROM nginx:alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# O service worker do MSW é só para desenvolvimento.
RUN rm -f /usr/share/nginx/html/mockServiceWorker.js
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
