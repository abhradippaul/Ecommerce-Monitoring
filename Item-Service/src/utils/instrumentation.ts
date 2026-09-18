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
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  METRIC_HTTP_CLIENT_REQUEST_DURATION,
} from '@opentelemetry/semantic-conventions';
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
      instrumentName: METRIC_HTTP_CLIENT_REQUEST_DURATION,
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
        options: {
          boundaries: [
            5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
            1500, 2000, 3000, 5000,
          ],
        },
      },
    },
    {
      instrumentName: 'item.dependency.duration',
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
        options: {
          boundaries: [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
        },
      },
    },
  ],
  traceExporter: new OTLPTraceExporter({
    url: config.otelExporterOtlpTracesEndpoint,
  }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: config.otelExporterOtlpMetricsEndpoint,
      }),
      exportIntervalMillis: 1000,
    }),
  ],
  logRecordProcessors: [
    new SimpleLogRecordProcessor({ exporter: new ConsoleLogRecordExporter() }),
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter({ url: config.otelExporterOtlpLogsEndpoint }),
    }),
  ],
  instrumentations: [getNodeAutoInstrumentations(), new WinstonInstrumentation()],
});

export default sdk;
