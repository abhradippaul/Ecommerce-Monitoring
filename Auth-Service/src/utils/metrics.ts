import { metrics } from '@opentelemetry/api';
import { config } from './config.js';
import { METRIC_HTTP_CLIENT_REQUEST_DURATION } from "@opentelemetry/semantic-conventions"

const meter = metrics.getMeter(config.serviceName, config.serviceVersion);

const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests',
});

const latencyHistogram = meter.createHistogram(METRIC_HTTP_CLIENT_REQUEST_DURATION, {
  description: 'HTTP request latency',
  unit: 'ms',
});

const validationErrorCounter = meter.createCounter('validation.errors.total', {
  description: 'Total validation errors',
});

export { requestCounter, latencyHistogram, validationErrorCounter };
