import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './appRouter';
import { createTRPCContext, type SessionStore } from './context';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';

export interface CreateHandlerOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
}

export function createTRPCHandler(opts: CreateHandlerOptions) {
  return (request: Request) => {
    return fetchRequestHandler({
      endpoint: '/trpc',
      req: request,
      router: appRouter,
      createContext: async ({ req }: { req: Request }) => {
        return createTRPCContext({
          sessionStore: opts.sessionStore,
          db: opts.db,
          request: req,
        });
      },
    });
  };
}
