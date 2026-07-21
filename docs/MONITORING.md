# Monitoring and Alerting

## Signals

The API exports Prometheus metrics at bearer-protected `/metrics`, structured Pino logs with request IDs, and optional OpenTelemetry traces over OTLP/HTTP. The web error boundary emits `cognexa:error`; a production error-tracking adapter and source-map upload still require provider configuration.

The production overview dashboard tracks target availability, request rate, 5xx percentage, p50/p95 latency, and process memory. Import `deploy/observability/grafana-dashboard.json` into Grafana. Apply the ServiceMonitor and PrometheusRule resources only after installing Prometheus Operator and creating the runtime secret.

## Alert routing

- Critical: API unavailable, sustained 5xx, required database/Redis failure. Page the primary on-call and create an incident.
- Warning: sustained latency, memory pressure, certificate expiry, backup staleness, dependency or storage growth. Notify the service channel and assign an owner.
- Informational: deploy start/success, HPA scaling, dependency recovery, expiring feature flags. Record in the operations stream.

Every actionable alert needs a runbook URL, owner, severity, and tested notification route. Configure Alertmanager or the chosen provider with deduplication, escalation, maintenance windows, and a dead-man signal.

## SLO starting points

Use a 30-day 99.9% successful-request availability objective for the authenticated learning API only after synthetic traffic accurately reflects real availability. Exclude client errors; include server errors, readiness loss, and validated timeouts. Establish separate latency objectives by route class because AI and upload-intent operations do not share catalog latency expectations.

These are starting points. Collect representative production data before tying contractual penalties to them.

## Required external monitors

- HTTPS blackbox checks for web, API liveness, readiness, login, catalog, and a safe lesson read.
- MongoDB Atlas and Redis provider integrations/exporters.
- Kubernetes state metrics and node/container metrics.
- CDN/WAF analytics, DNS, certificate, and origin health.
- Queue age/dead-letter dashboards after durable workers are implemented.
- Browser Core Web Vitals, JavaScript errors, release/source-map context, and session-safe tracing.
