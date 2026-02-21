import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './appRouter';
import { createTRPCContext, type SessionStore, type SessionData } from './context';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';

export interface CreateHandlerOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
}

export function createTRPCHandler(opts: CreateHandlerOptions) {
  return (request: Request, session?: SessionData) => {
    return fetchRequestHandler({
      endpoint: '/trpc',
      req: request,
      router: appRouter,
      createContext: async () => {
        if (session) {
          return {
            session,
            tenantId: session.tenantId,
            userId: session.userId,
            db: opts.db,
          };
        }
        return createTRPCContext({
          sessionStore: opts.sessionStore,
          db: opts.db,
          request,
        });
      },
    });
  };
}
