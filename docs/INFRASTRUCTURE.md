# Infrastructure Guide

## Supported topology

The repository supports two immutable images: `cognexa-web` and `cognexa-server`. Production uses a CDN/WAF and TLS ingress, at least two stateless replicas of each image, MongoDB Atlas, managed Redis, Cloudinary, an OTLP collector, Prometheus-compatible metrics, and external secret management.

The release web image uses same-origin `/api/v1`; the ingress routes `/api` to the server. This keeps one digest promotable from staging to production without rebuilding environment-specific browser code.

The Kubernetes manifests in `deploy/k8s` are the enterprise reference deployment. The images can also run on Render, Railway, Fly.io, Azure App Service, or ECS. Vercel or Cloudflare Pages can host the static web build, but the API, database, Redis, cookies, CORS, and observability contracts remain required.

## Kubernetes prerequisites

- Kubernetes 1.29+ with Metrics Server.
- NGINX Ingress Controller in the `ingress-nginx` namespace, or reviewed patches for another controller.
- cert-manager and a `letsencrypt-production` ClusterIssuer.
- `cognexa-runtime` Secret provisioned by an external secret manager.
- MongoDB Atlas and Redis endpoints reachable from the workload network.
- Prometheus Operator only if applying `deploy/observability/servicemonitor.yaml` and `prometheus-rules.yaml`.
- MongoDB, Redis, and blackbox exporters for dependency and certificate alert rules.

Render manifests locally:

```bash
kubectl kustomize deploy/k8s/overlays/staging
kubectl kustomize deploy/k8s/overlays/production
```

Never apply `secret.example.yaml`. Create `cognexa-runtime` out of band, then grant the deployment identity read access only to the required environment secrets.

## Availability and scaling

Deployments use rolling updates with `maxUnavailable: 0`, readiness/startup/liveness probes, topology spreading, disruption budgets, resource requests/limits, and horizontal autoscaling. The API is stateless at the process boundary. MongoDB stores durable refresh sessions; Redis stores distributed rate-limit counters.

HPA thresholds are safe initial values, not permanent capacity claims. Calibrate them after load tests using request concurrency, latency, CPU throttling, memory, MongoDB pool pressure, and Redis saturation. Add queue-depth scaling only when durable workers are implemented.

## Network and security

Pods run as non-root with a read-only filesystem, no added capabilities, no service-account token, and the restricted Pod Security profile. Ingress is deny-by-default and admits traffic from the named ingress namespace. Provider egress must be controlled at the platform firewall or service-mesh layer because provider IP ranges are not stable enough for this repository to hard-code.

Cloudflare should proxy public DNS, enforce WAF/rate policies, and forward the original client IP through a trusted load balancer. Review Express `trust proxy` when the proxy depth changes.

## Provider configuration still required

- Create DNS records, CDN/WAF zones, TLS issuers, and origin rules.
- Provision MongoDB Atlas backups, private networking, users, and alerts.
- Provision managed Redis with TLS, eviction disabled for rate-limit correctness, and alerts.
- Create container registry access, GitHub protected environments, and workload credentials.
- Install and configure ingress, cert-manager, metrics, tracing, logging, error tracking, and exporters.
- Configure Cloudinary, email, push, and AI provider accounts where enabled.
