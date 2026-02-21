# AI Spec: Task 1 - Database Schema & Kysely Services

## 1. Why (Brief Context)

We are building a SaaS-ready hybrid training manager for athletes. This first task focuses entirely on the data layer and core business logic for tracking unified training load and daily wellness metrics.

## 2. What (Scope)

* Define the SQLite database schema for users, daily wellness metrics, and workout sessions.
* Implement shared Kysely database services to handle CRUD operations.
* Implement a service function to calculate the Acute:Chronic Workload Ratio (ACWR) based on session data.

## 3. Constraints (Boundaries)

* **Framework:** Use RedwoodSDK's Cloudflare Workers/D1 setup.
* **Database Builder:** MUST use Kysely for all database interactions. Do not use Prisma client for queries.
* **Authentication:** Set up the schema for Redwood's built-in dbAuth.
* **Multi-tenancy:** All core tables (DailyWellness, WorkoutSession) MUST include a tenant\_id column.
* **Calculation Rule:** Training load is strictly calculated as duration\_minutes \* sRPE.
* **ACWR Rule:** Acute is a 7-day rolling sum of training load. Chronic is a 28-day rolling average.
* **Out of Scope:** Do not build the frontend UI. Do not build the tRPC routers yet. Do not build child tables for specific strength/endurance details.

## 4. Tasks (Discrete Work Units)

* **Task 1:** Update the database schema to include User (dbAuth ready), DailyWellness (date, tenant\_id, RHR, HRV\_rMSSD), and WorkoutSession (date, tenant\_id, modality\_enum, duration, sRPE, training\_load).
* *Verify:* Run migration successfully and generate Kysely types.
* **Task 2:** Create a Kysely service for DailyWellness that handles creating records and calculating the HRV/RHR ratio.
* *Verify:* Write a backend test verifying the service correctly saves data and returns the proper ratio.
* **Task 3:** Create a Kysely service for WorkoutSession that handles creating a session (automatically calculating training load: duration \* sRPE).
* *Verify:* Write a backend test verifying the training load math is correct upon creation.
* **Task 4:** Create a Kysely service function calculateACWR(tenant\_id, date) that fetches the 7-day acute load and 28-day chronic load, returns the ratio, and returns a boolean isDanger if the ratio \> 1.5.
* *Verify:* Write a backend test using mock session data to verify the ACWR ratio and danger flag.
