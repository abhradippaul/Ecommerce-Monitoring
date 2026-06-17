import { metrics } from "@opentelemetry/api";
import type { Attributes } from "@opentelemetry/api";

const meter = metrics.getMeter('auth-service', '1.0.0');

const requestCounter = meter.createCounter('http_requests_total', {
    description: 'Total HTTP requests',
});

const latencyHistogram = meter.createHistogram('http_request_duration_ms', {
    description: 'HTTP request latency',
});

export function recordRequest(method: string, route: string, attributes?: Attributes) {
    requestCounter.add(1, { method, route, ...attributes });
}

export {
    requestCounter,
    latencyHistogram
}