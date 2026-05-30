# **Architectural Refactor Blueprint: Cloudflare (Flue) to Google Cloud (Gemini)**

## **1\. Core Stack Comparison Matrix**

| Architectural Tier | Cloudflare Stack (with Flue Framework) | Google Cloud Stack (with Gemini \+ Neon) |
| :---- | :---- | :---- |
| **Compute / Serverless Engine** | **Cloudflare Workers**: Bounded execution times and memory profiles running on V8 Isolates. | **Google Cloud Run**: Unconstrained, standard Node.js/TypeScript environment containerized via Docker. |
| **AI Orchestration Framework** | **Flue Framework**: Manages local filesystem sandboxing, manual state injection, and skill discovery protocols. | **Gemini API**: Natively handles conversational state loops, parallel tool calling, and high-token context blocks. |
| **Structured Relational Layer** | **Cloudflare D1**: Serverless SQLite instances running transactional tables accessed via Kysely. | **Neon (PostgreSQL 18\)**: Serverless Postgres with decoupled compute that scales down to absolute zero when idle. |
| **Unstructured Context (Soul)** | **Cloudflare R2**: Plaintext Markdown Wiki profiles (Athlete\_Profile.md) mounted to user sub-prefixes. | **Google Cloud Storage (GCS)**: Standard object storage hosting user markdown files, pulled into stateless memory buckets per call. |
| **Semantic Knowledge Base** | **Cloudflare Vectorize**: A separate, standalone vector index requiring explicit standalone RAG skills to query. | **Neon pgvector**: Native PostgreSQL vector column extension running alongside standard transactional tables in the same DB. |
| **Token Optimization Engine** | **Stateful Model Escalation**: Custom code tracking token metrics and executing model upgrades (e.g., Haiku to Sonnet). | **Native Context Caching**: Automatic 75% cost discount for historical text sequences, system instructions, and user profiles. |
| **Identity & Tenant Isolation** | **Redwood JWTs**: Token parsing inside the worker where sub claims directly enforce the R2 sandbox scope paths. | **Firebase Auth**: Client-side identity provider that securely passes verified tokens down to Cloud Run endpoints. |

## **2\. Component Replacement Analysis**

The transition to the Google Cloud \+ Neon stack completely flatlines the code footprint by replacing manual orchestration framework patterns with native cloud capabilities.

### **Compute: From Cloudflare Worker Isolates to Google Cloud Run**

* **The Flue Constraints:** On Cloudflare, your backend services have to stay extremely lean to comply with Worker script size limits, memory boundaries, and strict V8 execution time ceilings. Advanced mathematical evaluations or multi-step algorithms risk causing timeout flags.

* **The Gemini Replacement:** Moving to **Cloud Run** gives you a standard, containerized Node.js environment. The backend acts as a standard Express or Fastify server. You gain absolute freedom over execution times, file streams, and memory overhead—allowing your Kysely services to perform heavy computations comfortably without isolate-level throttling.

### 

### **AI Framework: From Flue Sandboxes to Native Gemini Function Calling**

* **The Flue Architecture:** Flue requires initializing a getVirtualSandbox() mounted to an R2 bucket prefix (users/${userId}/), mimicking a local Unix filesystem shell so the agent can discover directory structures and read/write files. To write data, you have to build structured SKILL.md files instructing the agent how to communicate with your Kysely database adapters.

* **The Gemini Replacement:** **Gemini** removes the virtual shell infrastructure entirely. Instead of a filesystem sandbox, Cloud Run pulls the user's Athlete\_Profile.md out of GCS during the session handshake and appends it cleanly to Gemini's systemInstruction configuration. Database writes are handled via native **Function Calling**. Your existing Kysely logic is exposed to Gemini as a standard TypeScript function schema array; Gemini evaluates the prompt, outputs a structured JSON tool call, and Cloud Run executes the query directly against the database.

### **Relational & Semantic Convergence: From D1 \+ Vectorize to Neon \+ pgvector**

* **The Flue Architecture:** Data is split between two separate storage layers on the edge: **D1** for structured relational logs and **Vectorize** for your scientific reference library. This forces the agent to use distinct, fragmented retrieval skills to fetch different types of data.

* **The Gemini Replacement:** **Neon** unifies these two layers into a single database engine. Your exercise logs, schemas, and user data sit in traditional normalized tables, while your sports science reference library resides in an adjacent table utilizing a native PostgreSQL vector column type. You can perform complex semantic similarity lookups using standard SQL distance operators (\<=\> or \<\#\>) within a single, unified database connection string, removing all synchronization overhead.

### 

### **Economic Management: From Manual Escalation to Native Context Caching**

* **The Flue Architecture:** To prevent context windows from saturating and killing profit margins, Flue relies on a complex **Microscope-to-Telescope model**. It forces you to write custom "Stateful Escalation" code to manually capture chat arrays, serialize the session state, and upgrade the connection from cheap models to expensive ones when heavy reasoning is required.

* **The Gemini Replacement:** **Gemini 1.5 Pro’s native Context Caching** completely automates this process. Because the system instructions, user profiles, and persistent chat histories remain largely static throughout a heavy training log session, Gemini automatically caches the data directly on Google's infrastructure. You don't need to write model-switching logic, handle state handoffs, or restrict the agent's Vision parameters—the platform applies a **75% input discount** to the entire cached context window automatically.