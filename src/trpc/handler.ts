import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './appRouter';
import { createTRPCContext, type SessionStore, type SessionData } from './context';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';

export interface CreateHandlerOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
  allowedOrigin?: string;
}

function getCorsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function createTRPCHandler(opts: CreateHandlerOptions) {
  const corsHeaders = getCorsHeaders(opts.allowedOrigin ?? '*');

  return async (request: Request, session?: SessionData) => {
    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req: request,
      router: appRouter,
      createContext: async () => {
        if (session) {
          return {
            session,
            tenantId: session.tenantId,
            userId: session.userId,
            role: session.role,
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

    // Add CORS headers to the response
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}
