### AI Spec\_API\_Layer

**1\. Why (Brief Context)**

We have successfully built our SQLite (D1) database schema and Kysely services for our training manager. We now need to expose these services securely to the frontend using tRPC, ensuring end-to-end type safety.

**2\. What (Scope)**

* Set up the tRPC server infrastructure within the RedwoodSDK worker.  
* Create a tRPC router for DailyWellness to log and fetch morning readiness metrics.  
* Create a tRPC router for WorkoutSession to log sessions and fetch the calculated Acute:Chronic Workload Ratio (ACWR).

**3\. Constraints (Boundaries)**

* **Framework:** Use RedwoodSDK's standard routing and middleware.  
* **API Protocol:** MUST use tRPC. Do not build standard REST endpoints.  
* **Logic:** Do NOT rewrite the business logic. The tRPC routers must import and use the existing shared Kysely services (e.g., createWorkoutSession, calculateACWR).  
* **Multi-tenancy Security:** Every tRPC route must extract the tenant\_id from the current authenticated user's session context and pass it into the Kysely service. A user must never be able to query without a tenant\_id.  
* **Out of Scope:** Do not build the frontend UI or React components. Do not touch the database schema.

**4\. Tasks (Discrete Work Units)**

* **Task 1:** Initialize the base tRPC setup in the RedwoodSDK worker, creating the context (ctx) that extracts the user's tenant\_id from the Durable Object session.  
* *Verify:* The base publicProcedure and protectedProcedure (which throws a 401 if no user session exists) are defined.  
* **Task 2:** Create the wellnessRouter with logDailyMetrics (mutation) and getMetricsByDate (query) using the existing Kysely services.  
* *Verify:* Write a test or use tRPC's caller to verify the router successfully inserts and retrieves data.  
* **Task 3:** Create the trainingRouter with logSession (mutation) and getACWRStatus (query).  
* *Verify:* Write a test verifying that querying getACWRStatus successfully returns the acute\_load, chronic\_load, ratio, and isDanger boolean by calling the underlying calculateACWR service.

