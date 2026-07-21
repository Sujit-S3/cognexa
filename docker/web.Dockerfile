FROM node:22-alpine AS build
ARG APP_VERSION=0.1.0
ARG COMMIT_SHA=development
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY Server/package.json Server/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile --filter web...

COPY web web
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
USER root
RUN apk update && apk upgrade --no-cache
ARG APP_VERSION=0.1.0
ARG COMMIT_SHA=development
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build --chown=101:101 /workspace/web/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
LABEL org.opencontainers.image.title="Cognexa Web" \
  org.opencontainers.image.version=$APP_VERSION \
  org.opencontainers.image.revision=$COMMIT_SHA \
  org.opencontainers.image.source="https://github.com/Sujit-S3/nexus-ai"
