import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_URL_PATH,
  ATTR_ERROR_TYPE,
} from '@opentelemetry/semantic-conventions';
import type { Request, Response } from 'express';
import { config } from './config.js';
import { HttpError } from './error.js';

const tracer = trace.getTracer(config.serviceName, config.serviceVersion);

/**
 * Record error details and status on a span
 */
function handleSpanError(span: Span, err: unknown) {
  const error = err instanceof Error ? err : new Error('Unknown error');
  span.setAttribute(ATTR_ERROR_TYPE, error.name);

  if (err instanceof HttpError && err.statusCode < 500) {
    // Client errors (4xx) should not mark the trace span as failed
    span.setStatus({ code: SpanStatusCode.OK });
  } else {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
}

/**
 * Trace standard operations / internal sub-spans (e.g. schema validation, DB calls)
 */
async function withSpan<T>(name: string, fn: (span: Span) => Promise<T> | T): Promise<T> {
  return tracer.startActiveSpan(name, async span => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      handleSpanError(span, err);
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace HTTP controller handlers (records request method, URL path, and response status code)
 */
async function withHttpSpan<T>(
  name: string,
  req: Request,
  res: Response,
  fn: (span: Span) => Promise<T> | T
): Promise<T> {
  return tracer.startActiveSpan(name, async span => {
    // 1. Record incoming HTTP request metadata
    if (req.method) {
      span.setAttribute(ATTR_HTTP_REQUEST_METHOD, req.method);
    }
    const path = req.baseUrl && req.path ? `${req.baseUrl}${req.path}` : req.originalUrl || req.url;
    if (path) {
      span.setAttribute(ATTR_URL_PATH, path);
    }

    try {
      const result = await fn(span);

      // 2. Record response status after handler finishes
      if (typeof res.statusCode === 'number') {
        span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, res.statusCode);
        if (res.statusCode >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${res.statusCode}` });
          span.setAttribute(ATTR_ERROR_TYPE, `${res.statusCode}`);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      return result;
    } catch (err) {
      if (typeof res.statusCode === 'number') {
        span.setAttribute(
          ATTR_HTTP_RESPONSE_STATUS_CODE,
          res.statusCode >= 400 ? res.statusCode : 500
        );
      }
      handleSpanError(span, err);
      throw err;
    } finally {
      span.end();
    }
  });
}

export { withSpan, withHttpSpan, tracer };
