import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';
import { config } from './config.js';
import { HttpError } from './error.js';

const tracer = trace.getTracer(config.serviceName, config.serviceVersion);

async function withSpan<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async span => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      if (err instanceof HttpError && err.statusCode < 500) {
        // Client errors (4xx) should not mark the trace span as failed
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      }
      throw err;
    } finally {
      span.end();
    }
  });
}

export { withSpan, tracer };
