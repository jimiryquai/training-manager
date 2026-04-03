import { initTRPC, TRPCError } from '@trpc/server';
import type { TRPCContext } from './context';
import { ServiceError } from '../services/errors';

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.userId || !ctx.role) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  try {
    return await next({
      ctx: {
        ...ctx,
        session: ctx.session,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      const codeMap: Record<string, 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR'> = {
        NOT_FOUND: 'NOT_FOUND',
        UNAUTHORIZED: 'UNAUTHORIZED',
        VALIDATION_ERROR: 'BAD_REQUEST',
        DATABASE_ERROR: 'INTERNAL_SERVER_ERROR',
      };
      throw new TRPCError({
        code: codeMap[error.code] ?? 'INTERNAL_SERVER_ERROR',
        message: error.message,
        cause: error.cause,
      });
    }
    throw error;
  }
});
