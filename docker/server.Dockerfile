FROM node:22-alpine AS build
ARG APP_VERSION=0.1.0
ARG COMMIT_SHA=development
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY Server/package.json Server/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile --filter cognexa-server...

COPY Server Server
RUN pnpm --filter cognexa-server build \
  && pnpm --filter cognexa-server deploy --prod /output

FROM node:22-alpine AS runtime
ARG APP_VERSION=0.1.0
ARG COMMIT_SHA=development
ENV NODE_ENV=production
ENV APP_VERSION=$APP_VERSION
ENV COMMIT_SHA=$COMMIT_SHA
WORKDIR /app
COPY --from=build --chown=node:node /output ./
USER node
EXPOSE 4000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="Cognexa API" \
  org.opencontainers.image.version=$APP_VERSION \
  org.opencontainers.image.revision=$COMMIT_SHA \
  org.opencontainers.image.source="https://github.com/Sujit-S3/nexus-ai"
CMD ["node", "dist/server.js"]
