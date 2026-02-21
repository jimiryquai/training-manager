import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { defineDurableSession } from "rwsdk/auth";
import { env } from "cloudflare:workers";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";
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
  },
  route("/trpc/*", async ({ request }) => {
    return trpcHandler(request);
  }),
  render(Document, [route("/", Home)]),
]);
