# High API Latency

**Severity:** Warning; raise to critical when availability is affected. **Owner:** API on-call.

1. Compare p50, p95, and p99 by route and release. Inspect trace spans for database, Redis, AI, storage, and network time.
2. Check CPU throttling, memory/GC, connection pools, slow queries, cache behavior, provider rate limits, and ingress latency.
3. Apply bounded concurrency/backpressure, isolate an optional provider, or roll back the causal release. Scale replicas only when the bottleneck is replica CPU/concurrency.
4. Recovery requires sustained latency below the route SLO and no growing backlog or error rate.
