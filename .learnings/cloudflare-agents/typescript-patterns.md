---
module: cloudflare_agents
problem_type: best_practice
tags: ["typescript", "env", "kysely"]
---
### [2026-03-21] Cloudflare Agents TypeScript Patterns
When using the Cloudflare `agents` package with TypeScript:

1. **Env Type Definition**: Always extend `Cloudflare.Env` for agent environment types:
   ```typescript
   interface CoachAgentEnv extends Cloudflare.Env {
     DB: D1Database;
   }
   ```

2. **State Interface**: Define state as an exported interface for type safety:
   ```typescript
   export interface CoachAgentState {
     userId: string;
     tenantId: string;
     // ... other fields
   }
   ```

3. **Generic Parameters**: `Agent<Env, State, Props>` - Props defaults to `Record<string, unknown>`

4. **Avoid Duplicate Exports**: Don't re-export state types in both the class file and index.ts - export once from the definition file.

5. **Kysely Integration**: Create a lazy-initialized getter for the database:
   ```typescript
   private _db: Kysely<Database> | null = null;
   private getDb(): Kysely<Database> {
     if (!this._db) {
       this._db = new Kysely<Database>({
         dialect: new D1Dialect({ database: this.env.DB }),
       });
     }
     return this._db;
   }
   ```

6. **Worker Env Type**: Use simple `DurableObjectNamespace` without generics to avoid branded type issues:
   ```typescript
   export type Env = {
     DB: D1Database;
     COACH_AGENT_DO: DurableObjectNamespace; // No generic parameter
   };
   ```
