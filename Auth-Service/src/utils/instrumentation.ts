/*instrumentation.ts*/
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import {
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

const sdk = new NodeSDK({
  serviceName: 'auth-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
      }),
      exportIntervalMillis: 10000,
    }),
  ],
  logRecordProcessors: [
    new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: 'http://localhost:4318/v1/logs',
      })
    ),
  ],
  instrumentations: [getNodeAutoInstrumentations(), new WinstonInstrumentation()],
});

export default sdk;
