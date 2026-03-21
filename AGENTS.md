# Shared Engineering Standards & Constraints

This document contains the global technical standards that ALL agents must adhere to. Individual roles and workflows are defined in `~/.pi/agent/agents/*.md`.

## 1. Technical Constraints (Mandatory)

### Database & ORM
* **Cloudflare D1:** Use `wrangler d1 migrations create` for all schema changes.
* **Kysely:** Use strictly typed Kysely interfaces. Do NOT use Drizzle, Prisma, or other ORMs.
* **D1 SQL & Variable Limits:** **Batch all mass inserts** (limit 5 records per query) to avoid "too many SQL variables" errors [2, 6].
* **Multi-tenancy:** Maintain `tenant_id` for data isolation. Allow `NULL` only for global system templates.

### AI Agent Infrastructure
* **Cloudflare Agents:** Use the `agents` package. Use `this.setState` for state and `this.sql` for history.
* **WebSocket Hibernation (CRITICAL):** Use `this.ctx.acceptWebSocket(server)`. Do NOT use `ws.accept()` or legacy `addEventListener`.
* **Alarms & Scheduling:** Use `this.storage.setAlarm()` for retries/delayed work and `this.schedule()` for cron-like tasks.

### Code Quality
* **Zero Magic:** Use standard Web APIs; avoid hidden framework abstractions.
* **Imports:** Explicitly import all methods, classes, and types (ES Modules only).
* **Dependencies:** No FFI/native/C bindings in Worker code.

## 2. Testing Standards
* **Anti-Mock Rule:** Write true integration tests. Do NOT mock the database or tRPC routers.
* **Test Bridge:** Use RedwoodSDK `/_test` route and `vitestInvoke` for worker-context testing.
* **TDD Workflow:** Failing Test -> Implementation -> Passing Test.

## 3. Framework Gotchas (Review Before Implementation)
* **tRPC Context:** Middleware sessions do NOT pass automatically; pass them explicitly to handlers.
* **Fate Data Views:** Use explicit nested field paths in `resolve()` selects (e.g., `['history.id']`).
* **ACWR Calculation:** Calculate historical ACWR for *each specific day* to maintain chart accuracy.
* **Tailwind v4:** Ensure `@theme` block is manually defined in `globals.css` for shadcn/ui.