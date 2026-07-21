# Contributing to Cognexa

New work targets `web/` and `Server/src/`; do not add features to `Client/` or the legacy JavaScript API. Start with an issue or short design note for contract, data-model, security, payment, AI, or cross-domain changes.

Use a feature branch and conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Keep changes domain-focused. Do not mix mechanical formatting with behavior unless required by the change.

Before opening a pull request:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

A pull request describes the user outcome, approach and alternatives, risk, data/index changes, security/privacy impact, test evidence, rollout/flag, monitoring, and rollback. Update OpenAPI and documentation with contract changes. Add an ADR for decisions that constrain future work.

Secrets, production data, copied customer content, access tokens, and AI provider keys must never enter code, fixtures, logs, screenshots, or `VITE_` variables. Report security issues through the private process in `SECURITY.md`.

Reviewers check authorization and ownership, input/output validation, accessibility, async states, query/index cost, idempotency, external failure behavior, observability, and backward compatibility—not only the happy path.
