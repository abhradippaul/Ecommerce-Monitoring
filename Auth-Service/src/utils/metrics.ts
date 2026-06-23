import { metrics } from '@opentelemetry/api';
import { config } from './config.js';

const meter = metrics.getMeter(config.serviceName, config.serviceVersion);

const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total HTTP requests',
});

const latencyHistogram = meter.createHistogram('http_request_duration', {
  description: 'HTTP request latency',
  unit: 'ms',
});

const validationErrorCounter = meter.createCounter('validation_errors_total', {
  description: 'Total validation errors',
});

export { requestCounter, latencyHistogram, validationErrorCounter };
