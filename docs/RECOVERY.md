# Backup, Recovery, and Continuity

## Targets

Initial planning targets are RPO 15 minutes and RTO 2 hours for the learning core. Product and compliance owners must approve these targets before launch; this document is not proof that a provider meets them.

## Backup policy

- MongoDB Atlas continuous backup plus daily snapshots, copied to a separate administrative boundary.
- Cloudinary asset retention/versioning according to the selected plan, plus export or source retention for business-critical originals.
- Redis is not the system of record. Rate-limit counters may be lost; durable queues must define persistence and replay before they ship.
- Kubernetes, CI workflows, monitoring rules, dashboards, and runbooks are version controlled.
- Secret-manager backup and break-glass access follow the provider's recovery procedure.

Automated archive verification detects corruption and command-level readability. It does not replace a restore drill.

## Restore drill

1. Open a tracked drill with owner, target RPO/RTO, and isolation controls.
2. Restore the selected snapshot into a new non-production Atlas project or cluster.
3. Point an isolated API deployment at the restored database and dedicated Redis.
4. Run migrations, smoke tests, record counts, critical relationship checks, and representative learner/instructor flows.
5. Compare snapshot time, completion time, missing writes, errors, and application version compatibility.
6. Delete the isolated environment using the provider console after evidence is retained.

Never test a restore over an existing database. The repository verification script uses `mongorestore --dryRun`; live restore execution remains an explicitly approved operator action.

## Regional or provider failure

Declare an incident, freeze releases, confirm the failure domain, and choose either provider recovery or failover. Restore infrastructure from reviewed manifests, inject environment-specific secrets, restore data, deploy the last known-good digests, run smoke and integrity checks, then update DNS with a deliberately low-risk TTL plan. Announce recovery only after write paths and authentication are verified.

## Application rollback

Use the protected `Roll Back Deployment` workflow with known-good Kubernetes revision numbers and expected commit. It rolls back web and API deployments and runs smoke checks. Additive indexes remain. If a data change is not backward compatible, stop and use its separately approved reconciliation/restore procedure.
