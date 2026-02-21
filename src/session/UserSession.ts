export interface SessionData {
  userId: string;
  tenantId: string;
}

export class UserSession implements DurableObject {
  private storage: DurableObjectStorage;
  private session: SessionData | undefined;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/session' && request.method === 'GET') {
      const session = await this.getSession();
      return Response.json(session);
    }
    
    if (url.pathname === '/session' && request.method === 'POST') {
      const data = await request.json() as SessionData;
      const saved = await this.saveSession(data);
      return Response.json(saved);
    }
    
    if (url.pathname === '/session' && request.method === 'DELETE') {
      await this.revokeSession();
      return new Response(null, { status: 204 });
    }
    
    return new Response('Not Found', { status: 404 });
  }

  async getSession(): Promise<{ value: SessionData | null }> {
    if (!this.session) {
      this.session = await this.storage.get<SessionData>("session") ?? undefined;
    }
    return { value: this.session ?? null };
  }

  async saveSession(data: SessionData): Promise<SessionData> {
    this.session = data;
    await this.storage.put("session", data);
    return data;
  }

  async revokeSession(): Promise<void> {
    this.session = undefined;
    await this.storage.delete("session");
  }
}
