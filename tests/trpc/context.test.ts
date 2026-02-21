import { describe, it, expect } from 'vitest';
import { createTRPCContext } from '../../src/trpc/context';

describe('createTRPCContext', () => {
  it('should extract session from request', async () => {
    const mockSessionStore = {
      load: async () => ({ userId: 'user-1', tenantId: 'tenant-1' }),
    };

    const ctx = await createTRPCContext({
      sessionStore: mockSessionStore as any,
      db: {} as any,
      request: new Request('http://localhost/test'),
    });

    expect(ctx.session).toEqual({ userId: 'user-1', tenantId: 'tenant-1' });
    expect(ctx.tenantId).toBe('tenant-1');
  });

  it('should return null session when not authenticated', async () => {
    const mockSessionStore = {
      load: async () => null,
    };

    const ctx = await createTRPCContext({
      sessionStore: mockSessionStore as any,
      db: {} as any,
    });

    expect(ctx.session).toBeNull();
    expect(ctx.tenantId).toBeNull();
  });
});
