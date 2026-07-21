import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { env } from './env'

let telemetry: NodeSDK | undefined

if (env.OTEL_ENABLED && env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
  telemetry = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: env.APP_VERSION,
      'deployment.environment.name': env.APP_ENV,
      'service.instance.commit': env.COMMIT_SHA,
    }),
    traceExporter: new OTLPTraceExporter({ url: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  })
  telemetry.start()
}

export async function shutdownTelemetry(): Promise<void> {
  await telemetry?.shutdown()
}
