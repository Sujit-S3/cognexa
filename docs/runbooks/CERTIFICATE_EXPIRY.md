# Certificate Expiry

**Severity:** Warning at 14 days; critical at 72 hours. **Owner:** Platform on-call.

1. Identify the hostname, certificate chain, issuer, expiry, ingress secret, cert-manager Certificate/Order/Challenge, and DNS/HTTP validation state.
2. Fix issuer credentials, DNS, ingress routing, or rate-limit failures. Do not upload private keys to tickets or logs.
3. Verify renewal from an external network, full chain validity, HTTPS redirect, HSTS policy, and both app/API hosts.
4. Confirm the blackbox metric sees the new expiry and document why automatic renewal failed.
