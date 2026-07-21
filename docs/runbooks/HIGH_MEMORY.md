# High Memory

**Severity:** Warning; critical on OOM/restart loops. **Owner:** API on-call.

1. Identify affected pods, release, traffic, heap trend, RSS, restarts, and request/worker correlation.
2. Capture provider-safe diagnostics before restart if policy permits. Never dump secrets or learner content into an unrestricted store.
3. Roll back a regression or reduce traffic/concurrency. Restarting without finding a leak is temporary mitigation.
4. After recovery, reproduce under load, add a memory regression test, and recalibrate limits only with evidence.
