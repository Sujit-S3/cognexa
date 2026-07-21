# API Unavailable

**Severity:** Critical. **Owner:** API on-call.

1. Confirm the synthetic failure from a second network and inspect `/health/live`, `/health/ready`, ingress, pods, recent deploys, and provider status.
2. Correlate Kubernetes events, restarts, structured logs, traces, MongoDB, Redis, and CDN/WAF blocks by timestamp and request ID.
3. If a release caused the failure, run the protected rollback workflow with known-good revisions. If a dependency failed, remove unsafe traffic and follow its dependency runbook.
4. Do not bypass readiness, disable TLS, expose secrets, or restore over the production database.
5. Recovery requires healthy replicas across failure domains, passing external smoke checks, and stable error/latency signals for 15 minutes.
