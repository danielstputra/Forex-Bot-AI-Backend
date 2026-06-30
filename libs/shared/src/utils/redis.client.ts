import Redis from 'ioredis';

/**
 * Creates a Redis client with graceful degradation.
 * - Uses REDIS_URL env var (required on Railway/production).
 * - Falls back to localhost:6379 for local development.
 * - lazyConnect=true: does NOT throw on startup if Redis is unavailable.
 * - maxRetriesPerRequest=0: fails fast on individual commands instead of hanging.
 * - Suppresses unhandled "error" events by attaching a no-op listener — this
 *   prevents Node.js from crashing on ECONNREFUSED when Redis is optional.
 */
export function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      // Retry with exponential backoff up to 30s, then stop
      if (times > 10) {
        console.warn(`[Redis] Could not connect after ${times} retries. Disabling Redis.`);
        return null; // Stop retrying
      }
      return Math.min(times * 1000, 30000);
    },
  });

  // Prevent unhandled 'error' event crash (ECONNREFUSED spam)
  client.on('error', (err: Error) => {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      // Silently ignore connection refused — Redis is optional for local dev
      return;
    }
    console.error('[Redis] Unexpected error:', err.message);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully.');
  });

  return client;
}
