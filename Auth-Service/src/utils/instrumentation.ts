/*instrumentation.ts*/
import { NodeSDK } from '@opentelemetry/sdk-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader, AggregationType } from '@opentelemetry/sdk-metrics';
import {
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { config } from './config.js';

// Optional: Enable internal diagnostic logging for troubleshooting OTel itself
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
  }),
  views: [
    {
      instrumentName: 'http_request_duration',
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
        options: {
          boundaries: [100, 200, 300, 500, 800, 1000, 1500],
        },
      },
    },
  ],
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
      }),
      exportIntervalMillis: 5000,
    }),
  ],
  logRecordProcessors: [
    new SimpleLogRecordProcessor({ exporter: new ConsoleLogRecordExporter() }),
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter({ url: 'http://localhost:4318/v1/logs' }),
    }),
  ],
  instrumentations: [getNodeAutoInstrumentations(), new WinstonInstrumentation()],
});

export default sdk;
