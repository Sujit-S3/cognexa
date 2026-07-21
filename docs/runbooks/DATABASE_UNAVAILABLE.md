# Database Unavailable

**Severity:** Critical. **Owner:** Data platform and API on-call.

1. Confirm Atlas status, cluster state, private networking, DNS/TLS, credentials, connection limits, storage, and failover events.
2. The API should return readiness 503; do not force unhealthy replicas into traffic.
3. Restore connectivity or complete the provider failover. Rotate credentials only through the approved overlapping rotation plan.
4. Use the recovery guide for corruption or data loss. Never restore over the current production cluster.
5. Verify authentication, catalog, course authoring, writes, migrations, and lag before closing.
