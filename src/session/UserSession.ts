export interface SessionData {
  userId: string;
  tenantId: string;
}

export class UserSession implements DurableObject {
  private storage: DurableObjectStorage;
  private session: SessionData | undefined = undefined;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    return new Response("Not Found", { status: 404 });
  }

  async getSession() {
    if (!this.session) {
      this.session = await this.storage.get<SessionData>("session") ?? undefined;
    }
    return { value: this.session ?? null };
  }

  async saveSession(data: SessionData) {
    this.session = data;
    await this.storage.put("session", data);
    return data;
  }

  async revokeSession() {
    this.session = undefined;
    await this.storage.delete("session");
  }
}
