/*instrumentation.ts*/
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
    PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics';
import {
    SimpleLogRecordProcessor,
    ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        'service.name': 'auth-service',
    }),
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    metricReaders: [
        new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
                url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
            }),
            exportIntervalMillis: 15_000,
        }),
    ],
    logRecordProcessors: [
        new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
    ],
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-winston': {
                disableLogSending: true,
            },
        }),
    ],
});

export default sdk;

