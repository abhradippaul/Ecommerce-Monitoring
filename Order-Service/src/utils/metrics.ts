import { metrics, type Counter, type Histogram, type UpDownCounter } from '@opentelemetry/api';
import { METRIC_HTTP_CLIENT_REQUEST_DURATION } from '@opentelemetry/semantic-conventions';
import type { Request, Response, NextFunction } from 'express';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { config } from './config.js';

// ---------------------------------------------------------------------------
// OpenTelemetry Meter Initialization
// ---------------------------------------------------------------------------
const meter = metrics.getMeter(config.serviceName, config.serviceVersion);

// ---------------------------------------------------------------------------
// HTTP Layer & Golden Signals (RED Method: Rate, Errors, Duration, Saturation)
// ---------------------------------------------------------------------------

/**
 * Total incoming HTTP requests counter.
 * Labels: route, http_method, status_code, status ('success' | 'error')
 */
export const requestCounter: Counter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests partitioned by route, method, and status',
});

/**
 * HTTP request latency histogram.
 * Uses METRIC_HTTP_CLIENT_REQUEST_DURATION ("http.client.request.duration") with ms unit
 * to ensure seamless backwards compatibility with OTel collector & Grafana queries.
 * Labels: route, http_method, status_code, status ('success' | 'error')
 */
export const latencyHistogram: Histogram = meter.createHistogram(METRIC_HTTP_CLIENT_REQUEST_DURATION, {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

/**
 * Number of active / in-flight HTTP requests currently being processed.
 * Critical saturation signal for thread pool and event loop queueing.
 * Labels: http_method
 */
export const activeRequestsCounter: UpDownCounter = meter.createUpDownCounter('http.requests.active', {
  description: 'Current number of active in-flight HTTP requests',
});

// ---------------------------------------------------------------------------
// Order Management & Shopping Cart Domain Metrics
// ---------------------------------------------------------------------------

/**
 * Tracks order and cart operations (create_order, get_order, list_orders, add_to_cart, get_cart, etc.).
 * Labels: action, status ('success' | 'failure')
 */
export const orderOperationsCounter: Counter = meter.createCounter('order.operations.total', {
  description: 'Total order and cart operations partitioned by action and status',
});

/**
 * Tracks input and schema validation errors (HTTP 400).
 * Labels: error_type, route
 */
export const validationErrorCounter: Counter = meter.createCounter('validation.errors.total', {
  description: 'Total input and schema validation errors',
});

// ---------------------------------------------------------------------------
// Downstream Dependency Health (MongoDB, External Services)
// ---------------------------------------------------------------------------

/**
 * Tracks duration of external dependency calls (MongoDB, RabbitMQ, Item-Service).
 * Labels: dependency, operation, status ('success' | 'error')
 */
export const dependencyDurationHistogram: Histogram = meter.createHistogram('order.dependency.duration', {
  description: 'Duration of downstream dependency operations in milliseconds',
  unit: 'ms',
});

/**
 * Tracks dependency failures.
 * Labels: dependency, operation
 */
export const dependencyErrorsCounter: Counter = meter.createCounter('order.dependency.errors.total', {
  description: 'Total downstream dependency failures',
});

// ---------------------------------------------------------------------------
// Runtime Saturation & Process Health (Node.js Event Loop & Memory)
// ---------------------------------------------------------------------------
const elDelay = monitorEventLoopDelay({ resolution: 20 });
elDelay.enable();

const eventLoopDelayGauge = meter.createObservableGauge('nodejs.eventloop.delay', {
  description: 'Node.js event loop delay mean in milliseconds',
  unit: 'ms',
});

const eventLoopP99Gauge = meter.createObservableGauge('nodejs.eventloop.delay.p99', {
  description: 'Node.js event loop delay 99th percentile in milliseconds',
  unit: 'ms',
});

eventLoopDelayGauge.addCallback(observableResult => {
  const meanMs = elDelay.mean / 1e6;
  observableResult.observe(Number.isNaN(meanMs) ? 0 : meanMs);
});

eventLoopP99Gauge.addCallback(observableResult => {
  const p99Ms = elDelay.percentile(99) / 1e6;
  observableResult.observe(Number.isNaN(p99Ms) ? 0 : p99Ms);
});

const heapUsedGauge = meter.createObservableGauge('process.memory.heap_used', {
  description: 'Process heap memory currently used in bytes',
  unit: 'By',
});

const heapTotalGauge = meter.createObservableGauge('process.memory.heap_total', {
  description: 'Process heap memory total allocated in bytes',
  unit: 'By',
});

const rssGauge = meter.createObservableGauge('process.memory.rss', {
  description: 'Process resident set size (RSS) in bytes',
  unit: 'By',
});

heapUsedGauge.addCallback(observableResult => {
  observableResult.observe(process.memoryUsage().heapUsed);
});

heapTotalGauge.addCallback(observableResult => {
  observableResult.observe(process.memoryUsage().heapTotal);
});

rssGauge.addCallback(observableResult => {
  observableResult.observe(process.memoryUsage().rss);
});

// ---------------------------------------------------------------------------
// Production Helper Functions for SRE Instrumentation
// ---------------------------------------------------------------------------

export const recordOrderOperation = (
  action:
    | 'create_order'
    | 'get_order'
    | 'list_orders'
    | 'add_to_cart'
    | 'get_cart'
    | 'get_cart_count'
    | 'update_cart'
    | 'remove_from_cart'
    | 'sync_cart'
    | 'clear_cart',
  status: 'success' | 'failure'
) => {
  orderOperationsCounter.add(1, { action, status });
};

export const recordValidationError = (errorType: string, route: string = 'unknown') => {
  validationErrorCounter.add(1, { error_type: errorType, route });
};

export const recordDependencyDuration = (
  dependency: 'mongodb' | 'rabbitmq' | 'item_service',
  operation: string,
  durationMs: number,
  status: 'success' | 'error' = 'success'
) => {
  dependencyDurationHistogram.record(durationMs, { dependency, operation, status });
};

export const recordDependencyError = (
  dependency: 'mongodb' | 'rabbitmq' | 'item_service',
  operation: string
) => {
  dependencyErrorsCounter.add(1, { dependency, operation });
};

// ---------------------------------------------------------------------------
// Route Sanitization & Prometheus Cardinality Protection
// ---------------------------------------------------------------------------

/**
 * Normalizes request paths to parameterized routes (e.g. /api/v1/orders/:id)
 * to strictly prevent Prometheus high-cardinality label explosions.
 */
export function getRoutePattern(req: Request): string {
  if (req.route?.path) {
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${req.route.path}`;
  }
  const rawPath = req.baseUrl ? `${req.baseUrl}${req.path || ''}` : req.path || req.originalUrl?.split('?')[0] || '/';
  return rawPath
    .replace(/[0-9a-fA-F]{24}/g, ':id')
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':uuid')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

// ---------------------------------------------------------------------------
// Express Production HTTP Monitoring Middleware
// ---------------------------------------------------------------------------

/**
 * Production-level Express middleware that:
 * 1. Automatically tracks active / in-flight requests for saturation monitoring.
 * 2. Accurately measures end-to-end request duration via high-resolution process.hrtime.
 * 3. Records latency and request counts with normalized routes and true HTTP status codes.
 * 4. Captures 400s, 404s, 500s, and health checks without manual controller instrumentation.
 * 5. Prevents double-counting if a controller already marked the metric.
 */
export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const method = req.method;

  activeRequestsCounter.add(1, { http_method: method });

  let activeDecremented = false;
  const decrementActive = () => {
    if (!activeDecremented) {
      activeDecremented = true;
      activeRequestsCounter.add(-1, { http_method: method });
    }
  };

  const recordMetrics = (aborted: boolean = false) => {
    decrementActive();

    // Prevent duplicate recording if explicitly handled
    if (res.locals && res.locals._metricsRecorded) {
      return;
    }
    res.locals = res.locals || {};
    res.locals._metricsRecorded = true;

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const route = getRoutePattern(req);
    const statusCode = aborted && !res.writableEnded ? 499 : res.statusCode || 500;
    const status = statusCode >= 400 ? 'error' : 'success';

    requestCounter.add(1, {
      route,
      http_method: method,
      status_code: String(statusCode),
      status,
    });

    latencyHistogram.record(durationMs, {
      route,
      http_method: method,
      status_code: String(statusCode),
      status,
    });
  };

  res.on('finish', () => recordMetrics(false));
  res.on('close', () => {
    if (!res.writableEnded) {
      recordMetrics(true);
    } else {
      decrementActive();
    }
  });

  next();
};

export default {
  requestCounter,
  latencyHistogram,
  activeRequestsCounter,
  orderOperationsCounter,
  validationErrorCounter,
  dependencyDurationHistogram,
  dependencyErrorsCounter,
  recordOrderOperation,
  recordValidationError,
  recordDependencyDuration,
  recordDependencyError,
  getRoutePattern,
  httpMetricsMiddleware,
};
