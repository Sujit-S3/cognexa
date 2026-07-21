# Release Guide

## Versioning

Cognexa uses semantic versions. Patch releases fix backward-compatible defects, minor releases add backward-compatible capability, and major releases permit scheduled breaking changes after deprecation and migration windows. API contract compatibility is evaluated independently of marketing significance.

Create signed or protected tags in the form `vX.Y.Z`. The `Release Images` workflow builds both images for AMD64 and ARM64, publishes OCI metadata, SBOM/provenance attestations, and release notes containing immutable digests.

## Promotion

The same image digests move from staging to production. Environment values and secrets change; the image does not. The deploy workflow requires digest syntax, a full commit SHA, protected environment approval, additive migrations, rolling status, and external smoke checks.

Required GitHub environment secrets:

- `KUBE_CONFIG`: base64-encoded least-privilege kubeconfig for that environment.
- `API_URL`: public API origin without `/api/v1`.
- `WEB_URL`: public web origin.

The cluster separately requires the `cognexa-runtime` Secret. Do not duplicate its provider credentials in GitHub when external-secrets workload identity is available.

## Approval record

Production approval should include release/version, commit, image digests, migration list, backup evidence, security exceptions, known risks, observability links, support owner, rollback revisions, and change window.

## Rollback

Automatic deployment failure attempts a Kubernetes rollout undo. An operator must verify its result because a failed cluster or credential can also prevent rollback. For a deliberate rollback, use the protected workflow and known-good revisions, then verify the expected commit from `/health/live`.

Rollback does not automatically reverse data. All rolling-release database changes must use expand/migrate/contract sequencing. Destructive contract steps require a later release after the rollback window closes.
