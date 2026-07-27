# Security Policy

## Reporting

Do not open a public issue for a suspected vulnerability. Send a private report to `security@cognexa.app` with affected surface/version, reproduction, impact, and any suggested mitigation. Do not include real learner data. The project should acknowledge reports within two business days, provide an initial severity assessment within five, and coordinate disclosure after a fix.

## Supported path

Security fixes target the latest production release of `web/` and `Server/src/`. `Client/` and legacy JavaScript server code are unsupported migration references and must not be deployed.

## Baseline controls

- Short-lived memory-only access tokens and rotating opaque refresh tokens stored hashed server-side.
- `HttpOnly`, `SameSite=Lax`, production `Secure` refresh cookies; exact CORS allowlists.
- Server-side authorization for global roles, course ownership, enrollment, and resource access.
- Strict Zod request allowlists on supported mutating routes, bounded payloads, safe error shaping, Helmet, rate limits, and request correlation.
- Secret and credential redaction in structured logs; no secrets in frontend environment variables.
- Course media uses ownership-checked, short-lived Cloudinary signatures and bounded metadata. Malware scanning and a private quarantine workflow remain required before accepting untrusted learner uploads.
- The AI gateway requires authentication, rate limits, bounded context, and server-side provider credentials. A production safety/evaluation program remains a launch requirement.
- Dependency, SAST, secret, container, and infrastructure scans in CI; patch SLAs based on exploitability.

## Data protection

Collect the minimum data for a defined purpose. Document retention for accounts, submissions, messages, analytics, AI interactions, audit events, and proctoring separately. Encrypt in transit and at rest, restrict production access, log administrative reads/writes, and test deletion/export workflows. Never use production personal data in development or performance tests.

Proctoring can create biometric, surveillance, and minor-safety obligations. It remains disabled until jurisdiction, consent, alternatives, retention, human review, appeals, and vendor terms receive legal/security approval.

## Incident priorities

Severity 1 includes active credential compromise, cross-tenant access, remote code execution, payment compromise, or broad sensitive-data exposure. Revoke/rotate credentials, disable affected flags/integrations, preserve evidence, communicate through the incident process, and restore only after containment and validation. Every incident produces corrective actions and regression tests.
