import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { defineDurableSession } from "rwsdk/auth";
import { env } from "cloudflare:workers";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";
import { UserSession, type SessionData } from "./session/UserSession";

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

export default defineApp([
  setCommonHeaders(),
  async function sessionMiddleware({ request, ctx }) {
    const session = await sessionStore.load(request);
    ctx.session = session;
  },
  render(Document, [route("/", Home)]),
]);
