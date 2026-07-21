# High API Error Rate

**Severity:** Critical after the alert duration. **Owner:** API on-call.

1. Break down 5xx metrics by route, status, release, pod, dependency, and tenant-safe context.
2. Use `x-request-id` to join logs and traces; check saturation, timeouts, MongoDB/Redis/provider failures, and a recent configuration or migration.
3. Disable the affected feature flag when safe, scale only if saturation is proven, or roll back a causal release.
4. Confirm the 5xx ratio is below threshold and critical journeys pass before resolving. Add a regression test and incident follow-up.
