import { describe, it, expect, vi } from 'vitest';
import worker, { type Env, type ExecutionContext, type ScheduledEvent } from '../index.js';

describe('Cloudflare Worker Runtime & Security Tests', () => {
  const baseEnv: Env = {
    ENVIRONMENT: 'test',
    CORS_ORIGIN: 'http://localhost:3000,https://app.studyos.com',
    HYPERDRIVE: {
      connectionString: 'postgresql://test:test@127.0.0.1:5432/test',
    },
    R2_STORAGE: {},
    CRON_SECRET: 'test-cron-secret-32-chars-long-123456',
  };

  const mockCtx: ExecutionContext = {
    waitUntil: vi.fn((promise: Promise<unknown>) => promise),
    passThroughOnException: vi.fn(),
    props: {},
  };

  it('1. GET /health reports Edge runtime, Hyperdrive, and R2 configuration status', async () => {
    const req = new Request('http://localhost/health', { method: 'GET' });
    const res = await worker.fetch(req, baseEnv, mockCtx);

    expect(res.status).toBe(200);
    const body = await res.json() as {
      status: string;
      runtime: string;
      hyperdriveConfigured: boolean;
      r2Configured: boolean;
      timestamp: string;
    };
    expect(body.status).toBe('ok');
    expect(body.runtime).toBe('cloudflare-workers');
    expect(body.hyperdriveConfigured).toBe(true);
    expect(body.r2Configured).toBe(true);
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('2. GET /health correctly reports unconfigured Hyperdrive and R2 bindings', async () => {
    const unconfiguredEnv: Env = {
      ENVIRONMENT: 'test',
    };
    const req = new Request('http://localhost/health', { method: 'GET' });
    const res = await worker.fetch(req, unconfiguredEnv, mockCtx);

    expect(res.status).toBe(200);
    const body = await res.json() as {
      hyperdriveConfigured: boolean;
      r2Configured: boolean;
    };
    expect(body.hyperdriveConfigured).toBe(false);
    expect(body.r2Configured).toBe(false);
  });

  it('3. Fail-closed security: POST /workers/automations/tick rejects invocation when CRON_SECRET is unset in env', async () => {
    const envWithoutSecret: Env = {
      ENVIRONMENT: 'test',
      CRON_SECRET: undefined,
    };
    const req = new Request('http://localhost/workers/automations/tick', {
      method: 'POST',
      headers: { 'X-Cron-Secret': 'any-secret' },
    });
    const res = await worker.fetch(req, envWithoutSecret, mockCtx);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Unauthorized cron invocation');
  });

  it('4. POST /workers/automations/tick rejects invocation when X-Cron-Secret header is missing', async () => {
    const req = new Request('http://localhost/workers/automations/tick', {
      method: 'POST',
    });
    const res = await worker.fetch(req, baseEnv, mockCtx);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Unauthorized cron invocation');
  });

  it('5. POST /workers/automations/tick rejects invocation when X-Cron-Secret header is incorrect', async () => {
    const req = new Request('http://localhost/workers/automations/tick', {
      method: 'POST',
      headers: { 'X-Cron-Secret': 'wrong-secret' },
    });
    const res = await worker.fetch(req, baseEnv, mockCtx);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Unauthorized cron invocation');
  });

  it('6. POST /workers/automations/tick accepts invocation with valid X-Cron-Secret header', async () => {
    const req = new Request('http://localhost/workers/automations/tick', {
      method: 'POST',
      headers: { 'X-Cron-Secret': baseEnv.CRON_SECRET! },
    });
    const res = await worker.fetch(req, baseEnv, mockCtx);

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('7. Fail-closed security: POST /workers/rollover/tick rejects invocation when CRON_SECRET is unset or incorrect', async () => {
    // Missing env secret
    const resMissing = await worker.fetch(
      new Request('http://localhost/workers/rollover/tick', {
        method: 'POST',
        headers: { 'X-Cron-Secret': 'foo' },
      }),
      { ENVIRONMENT: 'test' },
      mockCtx
    );
    expect(resMissing.status).toBe(401);

    // Wrong header
    const resWrong = await worker.fetch(
      new Request('http://localhost/workers/rollover/tick', {
        method: 'POST',
        headers: { 'X-Cron-Secret': 'bad' },
      }),
      baseEnv,
      mockCtx
    );
    expect(resWrong.status).toBe(401);

    // Valid header
    const resValid = await worker.fetch(
      new Request('http://localhost/workers/rollover/tick', {
        method: 'POST',
        headers: { 'X-Cron-Secret': baseEnv.CRON_SECRET! },
      }),
      baseEnv,
      mockCtx
    );
    expect(resValid.status).toBe(200);
    const body = await resValid.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('8. CORS policy: handles preflight OPTIONS and echoes allowed origin with credentials', async () => {
    const req = new Request('http://localhost/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.studyos.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    const res = await worker.fetch(req, baseEnv, mockCtx);

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.studyos.com');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('9. scheduled() handler handles trigger events via ctx.waitUntil without unhandled rejection', async () => {
    const waitUntilSpy = vi.fn();
    const ctx: ExecutionContext = {
      waitUntil: waitUntilSpy,
      passThroughOnException: vi.fn(),
      props: {},
    };

    const scheduledEvent = {
      cron: '* * * * *',
      type: 'scheduled',
      scheduledTime: Date.now(),
    } as unknown as ScheduledEvent;

    await worker.scheduled(scheduledEvent, baseEnv, ctx);
    expect(waitUntilSpy).toHaveBeenCalledTimes(1);
  });
});
