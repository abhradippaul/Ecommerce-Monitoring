import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter('auth-service', '1.0.0');

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

export {
    requestCounter,
    latencyHistogram,
    validationErrorCounter
}