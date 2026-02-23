import { describe, it, expect } from 'vitest';
import { requireCoach } from '../../src/admin/interrupters';

describe('Coach Admin Routes', () => {
    it('redirects unauthenticated users trying to access /coach routes', async () => {
        const mockCtx: any = {
            session: null,
        };
        const result = await requireCoach({ ctx: mockCtx });
        expect(result).toBeInstanceOf(Response);
        expect(result?.status).toBe(302);
        expect(result?.headers.get('Location')).toBe('/');
    });

    it('allows access to /coach routes when authenticated', async () => {
        const mockCtx: any = {
            session: { userId: 'user-1', tenantId: 'tenant-1' },
        };
        const result = await requireCoach({ ctx: mockCtx });
        expect(result).toBeUndefined(); // Does not return a response, allows the route to continue
    });
});
