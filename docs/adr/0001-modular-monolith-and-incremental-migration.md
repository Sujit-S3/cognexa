# ADR 0001: Modular monolith and incremental legacy migration

Status: accepted  
Date: 2026-07-20

## Context

The repository contains a legacy React/Redux client and JavaScript API implementation beside a modern React/TypeScript client and TypeScript API modules. A big-bang rewrite would delay product learning and create an untestable cutover. Keeping both implementations active indefinitely would produce divergent authorization, data rules, and user experiences.

The projected scale—tens of thousands of users and low thousands of concurrent learners—does not require independent microservices for the transactional learning core.

## Decision

- `web/` and `Server/src/` are the only supported production path.
- `Client/` and JavaScript code outside `Server/src/` are frozen migration references.
- The TypeScript API remains a modular monolith with explicit domain boundaries and versioned `/api/v1` contracts.
- Domains move one at a time: characterize legacy behavior, define the contract, implement policy/service/repository tests, migrate data if needed, route traffic, observe, then remove legacy code after the rollback window.
- Independently scaling or failure-prone workloads—media processing, notifications, search indexing, AI generation, exports—use events/queues and may become separate deployables only after measured need.

## Consequences

Benefits: one transactional boundary, simpler local development and deployments, lower operating cost, incremental delivery, and a safe rollback path. Costs: temporary duplicate code remains visible, module boundaries need review discipline, and background workloads require deliberate extraction seams.

## Alternatives rejected

- Big-bang rewrite: high schedule and parity risk with little user feedback during the rewrite.
- Immediate microservices: multiplies deployment, observability, network, and consistency work before scale justifies it.
- Continue both clients: doubles feature and security maintenance and prevents a single product standard.

## Revisit conditions

Revisit a domain when it has a different scaling curve, availability boundary, compliance boundary, team ownership, or deployment cadence, and evidence shows a separate service produces more value than operational cost.
