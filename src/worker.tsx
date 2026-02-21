import { render, route, layout } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { defineDurableSession } from "rwsdk/auth";
import { env } from "cloudflare:workers";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";
import { AppLayout } from "@/app/layouts/AppLayout";
import { createTRPCHandler } from "@/trpc/handler";
import { UserSession, type SessionData } from "./session/UserSession";
import type { Database } from "./db/schema";

export type AppContext = {
  session?: { userId: string; tenantId: string } | null;
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
});

export default defineApp([
  setCommonHeaders(),
  async function sessionMiddleware({ request, ctx }) {
    const session = await sessionStore.load(request);
    ctx.session = session;
    
    // Dev-only: Check for dev session cookie
    if (!session && import.meta.env.DEV) {
      const cookies = request.headers.get("cookie") || "";
      const devSession = cookies.match(/dev_session=([^;]+)/)?.[1];
      if (devSession === "seed-user-001:seed-tenant-001") {
        ctx.session = {
          userId: "seed-user-001",
          tenantId: "seed-tenant-001",
        };
      }
    }
  },
  route("/trpc/*", async ({ request, ctx }) => {
    return trpcHandler(request, ctx.session ?? undefined);
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
      route("/", Home)
    ])
  ]),
]);
