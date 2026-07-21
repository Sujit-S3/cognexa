# Environment Setup

## Environment model

`NODE_ENV` controls Node runtime behavior. `APP_ENV` identifies the isolated deployment and accepts `development`, `test`, `preview`, `staging`, or `production`. Staging and production must run with `NODE_ENV=production`.

The examples in `config/environments/` document names only. They are not deployable secrets and must never be copied into a public CI log. Use a cloud secret manager or an external-secrets controller for confidential values.

## Required values

Every API process requires:

- `MONGODB_ATLAS_URI`, scoped to the environment database.
- `SECRET_KEY`, at least 32 random characters and independently rotated per environment.
- `CLIENT_URL` and `CORS_ALLOWED_ORIGINS`, using exact origins.
- `APP_VERSION` and `COMMIT_SHA`, injected from the immutable release.

Staging and production also require:

- `REDIS_URL` for replica-safe rate limits.
- `METRICS_AUTH_TOKEN`, at least 32 random characters, for Prometheus scraping.
- `COOKIE_SECURE=true`, so refresh cookies are never sent over plaintext transport.
- HTTPS for the client URL and every CORS origin.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` when `OTEL_ENABLED=true`.

Optional integrations are enabled only when their complete credential group is present: SMTP, VAPID, Cloudinary, AI gateway, and dependency-specific health-check URLs. Browser variables prefixed with `VITE_` are public and must never contain credentials.

## Validation

Validate the active process environment:

```bash
pnpm env:validate
```

Validate a local file without printing its values:

```bash
node scripts/validate-env.mjs --file ./path/to/runtime.env
```

The API independently validates its environment at boot and exits before listening when a required or unsafe value is detected.

## Rotation

1. Add the next credential version in the provider and secret manager.
2. Where the provider supports overlap, deploy readers that accept old and new values.
3. Roll every API replica and verify readiness, authentication, uploads, AI, mail, traces, and metrics.
4. Revoke the old value and record the change in the audit/change system.
5. For `SECRET_KEY`, plan a user-session invalidation window because existing access tokens become invalid.

Never rotate database, Redis, storage, or signing credentials without a tested rollback value and an incident owner.
