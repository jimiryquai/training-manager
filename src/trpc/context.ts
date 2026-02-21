import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';

export interface SessionData {
  userId: string;
  tenantId: string;
}

export interface SessionStore {
  load: (request: Request) => Promise<SessionData | null>;
}

export interface CreateContextOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
  request?: Request;
}

export interface TRPCContext {
  session: SessionData | null;
  tenantId: string | null;
  userId: string | null;
  db: Kysely<Database>;
}

export async function createTRPCContext(opts: CreateContextOptions): Promise<TRPCContext> {
  const session = opts.request 
    ? await opts.sessionStore.load(opts.request)
    : null;

  return {
    session,
    tenantId: session?.tenantId ?? null,
    userId: session?.userId ?? null,
    db: opts.db,
  };
}
