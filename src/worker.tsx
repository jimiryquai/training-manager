import { render, route, layout } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { defineDurableSession } from "rwsdk/auth";
import { env } from "cloudflare:workers";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { flue } from "@flue/runtime/app";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";
import { LogData } from "@/app/pages/logData";
import CoachTestPage from "@/app/pages/coachTest";
import { AppLayout } from "@/app/layouts/AppLayout";
import { createTRPCHandler } from "@/trpc/handler";
import { UserSession, type SessionData } from "./session/UserSession";
import type { Database } from "./db/schema";
import { handleVitestRequest } from "rwsdk-community/worker";
import * as testUtils from "./app/test-utils";

// ============================================================================
// Environment Type Export
// ============================================================================

export type Env = {
  DB: D1Database;
  AI: Ai;
  MEMORIES: R2Bucket;
  USER_SESSION_DO: DurableObjectNamespace;
  CoachAgent: DurableObjectNamespace;
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
};

export type AppContext = {
  session?: { userId: string; tenantId: string; role?: string } | null;
};

export const sessionStore = defineDurableSession({
  sessionDurableObject: env.USER_SESSION_DO as unknown as DurableObjectNamespace<{
    getSession(): Promise<{ value: SessionData } | { error: string }>;
    saveSession(data: SessionData): Promise<SessionData>;
    revokeSession(): Promise<void>;
  } & Rpc.DurableObjectBranded>,
});

export { UserSession };

function getDb() {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });
}

const trpcHandler = createTRPCHandler({
  sessionStore,
  db: getDb(),
  allowedOrigin: (env as unknown as Env).ALLOWED_ORIGIN,
});

const appFetch = defineApp([
  setCommonHeaders(),
  async function sessionMiddleware({ request, ctx }) {
    const session = await sessionStore.load(request);
    ctx.session = session;

    if (!session && import.meta.env.DEV) {
      const cookies = request.headers.get("cookie") || "";
      const devSession = cookies.match(/dev_session=([^;]+)/)?.[1];
      if (devSession === "seed-user-001:seed-tenant-001") {
        console.warn('[AUTH] Dev session bypass activated - DO NOT use in production');
        ctx.session = {
          userId: "seed-user-001",
          tenantId: "seed-tenant-001",
          role: "admin", 
        };
      }
    }
  },

  route("/_test", {
    post: ({ request }) => handleVitestRequest(request, testUtils as any),
  }),
  route("/trpc/*", async ({ request, ctx }) => {
    return trpcHandler(request, ctx.session as any);
  }),
  route("/dev-login", async ({ request }) => {
    if (!import.meta.env.DEV) {
      return new Response("Not found", { status: 404 });
    }
    const headers = new Headers({ Location: "/" });
    headers.set(
      "Set-Cookie",
      "dev_session=seed-user-001:seed-tenant-001; Path=/; HttpOnly; SameSite=Lax"
    );
    return new Response(null, { status: 302, headers });
  }),
  render(Document, [
    layout(({ children, requestInfo }) => <AppLayout currentPath={requestInfo?.path || '/'}>{children}</AppLayout>, [
      route("/", Home),
      route("/log", LogData),
      route("/coach-test", CoachTestPage)
    ])
  ])
]);

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    console.log(`[Queue] Processing ${batch.messages.length} proactive shadow coach triggers`);
    // Iterate over messages and dispatch to Flue, or call a scheduled workflow
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/agents/") || url.pathname.startsWith("/workflows/")) {
      const flueApp = flue();
      return flueApp.fetch(request, env, ctx);
    }
    // @ts-ignore
    return appFetch.fetch ? appFetch.fetch(request, env, ctx) : appFetch(request, env, ctx);
  }
};