# Product Requirements Document (PRD): Agent-Native AI Coaching Engine

## 1. Vision & Purpose
We are pivoting from our original MVP—a "SaaS-ready concurrent training manager" requiring manual data entry and a dedicated human coach UI—to an **Agent-Native AI Coaching Engine** [1]. The goal of this application is to completely eliminate the friction of manual workout logging and static periodization [1]. By utilizing an AI Coach powered by Cloudflare Workers AI and the Pi SDK, the app will act as a living, breathing training partner [1]. **The athlete interacts via a sleek Progressive Web App (PWA) for Phase 1 (with a native Expo/Flutter mobile app planned for Phase 2)**, or direct conversational voice inputs, while the AI dynamically manages the complex sports science math (ACWR, 1RMs, Wendler 5/3/1 scaling) behind the scenes in our Cloudflare D1 database [1].

## 2. Target Audience & Personas
*   **The Athlete (Human):** Focused entirely on execution and low-friction logging [2]. They interact with the mobile PWA to view escalating set checklists, log daily wellness, and verbally dictate workout deviations [2].
*   **The Coach (AI Agent):** Operates on the backend [2]. It reads the athlete's daily wellness scores, analyzes their historical performance, selects appropriate macrocycle/microcycle templates, and generates highly specific daily workout prescriptions using atomic database tools [2]. **There is no human Coach Admin interface** [2].

## 3. Core Agent-Native Principles
This product strictly adheres to the core rules of Agent-Native Architecture [3]:
*   **Parity:** Whatever the user can do through the UI (e.g., check a "completed as planned" box), the agent must be able to achieve through backend tools (e.g., updating database rows via voice transcription) [3].
*   **Files for Legibility, Databases for Structure:** The structured training data (sets, reps, metrics) will live in the Kysely/D1 database for fast UI rendering, while the AI Coach's long-term memory (`user_context.md`) and core personality (`soul.md`) will be stored as physical Markdown files in Cloudflare R2 [3].
*   **Emergent Capability:** By giving the AI atomic tools to read HRV/wellness data and manipulate workout tables, it will dynamically autoregulate the user's training [3]. Furthermore, the AI Coach can use autonomous scheduling (`this.schedule`) to run background health checks or automatically sync conversation state after a workout ends [4].

## 4. Core Features & Scope
*   **Phased Client Rollout:** Phase 1 focuses entirely on delivering a Progressive Web App (PWA) using the `useAgent` React hook to connect directly to the backend AI [5, 6]. **The backend must be built API-first to ensure seamless consumption by a native Expo or Flutter mobile app in the next phase** [5].
*   **Frictionless Authentication:** Implement RedwoodSDK's experimental **Passkey Addon** for passwordless FaceID/TouchID mobile logins, eliminating traditional email/password forms [5].
*   **Conversational Logging (Voice-to-D1):** The primary data entry method for deviations [5]. If an athlete does not complete a workout as planned, they use voice to explain the changes [5]. The AI parses this "gym slang", executes Kysely database updates, flags the session with `is_voice_entry = true`, and logs the reasoning in the `agent_interaction_log` [5].
*   **Hybrid Multi-Tenant Template Engine:** The system will hold a massive, global library of training programs and exercise dictionaries marked as "System Data" (`tenant_id = NULL`) [5]. When a user begins a program, the AI clones these templates into the user's private database sandbox (`tenant_id = user's ID`) so they can be safely customized [5].
*   **Dynamic Daily Wellness:** Capture an athlete's readiness via objective metrics (Resting Heart Rate, HRV) and subjective 1-5 sliders (Sleep, Diet, Mood, Muscle Soreness, Stress, Fatigue) [5]. The AI uses this data to calculate the Acute:Chronic Workload Ratio (ACWR) and govern the day's intensity [5].
*   **Abstract Benchmarking Engine:** Support for dynamic training maximums (like Wendler 5/3/1) and unit-agnostic tracking (kgs, seconds, reps, meters) so the AI can program both heavy barbell squats and gymnastics isometric holds perfectly [5].

## 5. Technical Constraints & Boundaries
*   **Architecture:** RedwoodSDK on the Cloudflare Workers runtime [7]. **The backend Kysely services and tRPC endpoints must remain strictly decoupled from the web frontend to support future native mobile clients** [7].
*   **Database:** Cloudflare D1 (SQLite) using **Kysely** as the strict query builder [7]. No Prisma Client for data operations [7].
*   **AI Orchestration:** Logic is handled via the native Cloudflare `agents` package and the Pi SDK in a continuous loop, bypassing rigid frontend UI forms for any complex data entry [7, 8].
*   **Testing:** Strict Test-Driven Development (TDD) using Vitest [7]. The database and AI tooling must be integration-tested against a local D1 instance (the "Anti-Mock" rule) before any UI is built [7].

## 6. Out of Scope
*   A desktop Coach Admin dashboard or complex Role-Based Access Control (RBAC) [9].
*   Pre-loading all templates into every new user's database [9].