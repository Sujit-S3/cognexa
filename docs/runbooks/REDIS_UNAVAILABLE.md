# Redis Unavailable

**Severity:** Critical in staging/production because distributed rate limits are required. **Owner:** Platform on-call.

1. Confirm provider status, TLS/DNS/networking, credentials, connection count, memory, and eviction policy.
2. Readiness should remove affected API replicas. Do not disable rate limiting or silently switch production replicas to independent memory stores.
3. Restore the managed service or fail over to a tested endpoint, then roll replicas if credentials changed.
4. Verify `PING`, API readiness, authentication throttling, AI throttling, memory, and eviction count.
