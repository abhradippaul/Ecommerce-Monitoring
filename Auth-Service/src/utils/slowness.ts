import { withSpan } from './traces.js';

/**
 * Simulates realistic traffic latency distribution:
 * - The majority (maximum) of requests complete fast around ~200ms (e.g. 50ms - 200ms).
 * - A minority (minimum) of requests simulate traffic spikes/slowness and take near ~1s (e.g. 800ms - 1100ms).
 *
 * Configurable via environment variables:
 * - ENABLE_SLOWNESS / SIMULATE_SLOWNESS / ENABLE_TRAFFIC_SLOWNESS / ENABLE_LOGIN_SLOWNESS: 'true' / 'false'
 * - SLOW_REQUEST_RATIO: fraction of requests that hit the slow spike path (default: 0.15 for 15%)
 * - FAST_REQUEST_MIN_MS: minimum latency for normal requests (default: 50)
 * - FAST_REQUEST_MAX_MS: maximum latency for normal requests (default: 200)
 * - SLOW_REQUEST_MIN_MS: minimum latency for slow requests (default: 800)
 * - SLOW_REQUEST_MAX_MS: maximum latency for slow requests (default: 1100)
 */
export const simulateSlowness = async (spanName: string = 'simulateTrafficSlowness') => {
  const isEnabled =
    process.env.ENABLE_SLOWNESS === 'true' ||
    process.env.SIMULATE_SLOWNESS === 'true' ||
    process.env.ENABLE_TRAFFIC_SLOWNESS === 'true' ||
    process.env.ENABLE_LOGIN_SLOWNESS === 'true' ||
    process.env.SIMULATE_LOGIN_SLOWNESS === 'true';

  if (!isEnabled) return;

  const slowRequestRatio = parseFloat(process.env.SLOW_REQUEST_RATIO || '0.15');
  const fastMinMs = parseInt(process.env.FAST_REQUEST_MIN_MS || '50', 10);
  const fastMaxMs = parseInt(process.env.FAST_REQUEST_MAX_MS || '200', 10);
  const slowMinMs = parseInt(
    process.env.SLOW_REQUEST_MIN_MS || process.env.SLOWNESS_MIN_MS || '800',
    10
  );
  const slowMaxMs = parseInt(
    process.env.SLOW_REQUEST_MAX_MS || process.env.SLOWNESS_MAX_MS || '1100',
    10
  );

  const isSlow = Math.random() < slowRequestRatio;
  const delay = isSlow
    ? Math.floor(Math.random() * (slowMaxMs - slowMinMs + 1)) + slowMinMs
    : Math.floor(Math.random() * (fastMaxMs - fastMinMs + 1)) + fastMinMs;

  if (delay > 0) {
    await withSpan(spanName, async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
    });
  }
};
