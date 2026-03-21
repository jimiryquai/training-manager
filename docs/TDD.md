# Technical Design Document (TDD): Agent-Native Backend Architecture

## 1. Technology Stack
*   **Framework:** RedwoodSDK (optimized for the Cloudflare Workers runtime) [10].
*   **Database (Structured):** Cloudflare D1 (SQLite) using Kysely as the strict query builder. No Prisma Client [10].
*   **Storage (Unstructured/Memory):** Cloudflare R2 [10].
*   **AI Orchestration:** Cloudflare `agents` package integrated with the Pi SDK [8, 10].
*   **Authentication:** RedwoodSDK Passkey Addon [10].
*   **Testing:** Vitest using the Cloudflare Workers Pool [10].

## 2. Database Schema & Hybrid Multi-Tenancy
We utilize a **Hybrid Multi-Tenant Pattern** to manage the split between a global library of programs and isolated user data [11]:
*   **System Data (Global Library):** Tables like `ExerciseDictionary` and template `TrainingPlan` rows will have their `tenant_id` set to `NULL` [11]. This designates them as global resources that the AI Coach can read and suggest to any user [11].
*   **User Data (Sandbox):** When a user begins a program, the AI Coach clones the global template rows into the user's private database sandbox, assigning the user's ID to the `tenant_id` column [11]. All progress, daily wellness, and actual workout logs are strictly isolated by this ID [11].
*   **Flattened Periodization:** To maximize query speed, periodization is flattened to `TrainingPlan` -> `TrainingSession` -> `SessionExercise` [11]. Complex groupings like supersets are managed via a `circuit_group` string rather than deep nested tables [11].

## 3. Storage & Memory Architecture (Files, Databases & DOs)
The application strictly enforces the agent-native principle of using the right tool for the right state [12]:
*   **Cloudflare D1 (Structure):** Stores all structured UI data, such as daily wellness metrics, benchmark 1RMs, and specific set/rep schemes [12].
*   **Cloudflare R2 (Legibility):** Stores the physical Markdown files that act as the AI Coach's long-term memory (`user_context.md`) and core personality instructions (`soul.md`) [12].
*   **Cloudflare Agents (Real-Time State):** Using the native `agents` package (which extends Durable Objects), this acts as the "tiny computer" memory for the live coaching session [8, 12]. It utilizes an internal SQLite instance (`this.sql`) for rapid context and maintains the persistent WebSocket connection [6, 12]. The `wrangler.jsonc` file MUST configure `migrations[].new_sqlite_classes` to the Agent class name [13, 14].

## 4. API & AI Integration Layer (CRUD Completeness & Streaming)
To enable the AI Coach to modify training programs autonomously, the backend must achieve **CRUD Completeness** [15].
*   **The Real-Time Agent Loop (Hibernation API):** The AI Coach operates entirely within a Cloudflare Agent. You **SHALL** use the WebSocket Hibernation API via `this.ctx.acceptWebSocket(server)` and define `async webSocketMessage()` / `async webSocketClose()` handlers [8, 16-18]. You must NEVER use the legacy `addEventListener` or `server.accept()` patterns inside the Agent [8, 16].
*   **Frontend Connection:** The frontend PWA connects directly to the Agent using the `useAgent` hook from the `agents/react` library [6, 19].
*   **Voice-to-DB Pipeline:** Instead of hardcoding frontend React forms, the Kysely services layer exposes atomic tools (Create, Read, Update, Delete) directly to the Pi agent [15]. The agent parses the voice input, uses Kysely tools to update the D1 database, automatically flags the row with `is_voice_entry = true`, and saves an `agent_interaction_log` for auditing [15].
*   **Autonomous Tasks:** The Agent uses the `this.schedule` API to trigger async tasks like saving chat summaries or data syncing without blocking the main event loop [4].
*   **API-First Design:** The backend Kysely services and endpoints must remain strictly decoupled from the web frontend so they can be seamlessly consumed by a native Expo or Flutter mobile app in Phase 2 [15].

## 5. Authentication & Security
The application will use the experimental RedwoodSDK **Passkey Addon** (WebAuthn) for passwordless biometric logins (FaceID/TouchID) [20]. Session state is managed securely via Cloudflare Durable Objects [20].

## 6. Testing Methodology (The "Anti-Mock" Rule)
The project adheres to strict Test-Driven Development (TDD) using Vitest [20]. We enforce the **"Anti-Mock" rule** to maintain the highest test fidelity [20]:
*   We will *not* mock the database, Kysely services, or tRPC routers. Mocks reduce fidelity and can hide bugs [20].
*   Instead, integration tests will use the RedwoodSDK "Test Bridge" pattern to execute real operations against a local Cloudflare D1 testing instance [20].
*   No UI components will be built until the underlying Kysely database services and AI tools are fully integration-tested and verified [20].
