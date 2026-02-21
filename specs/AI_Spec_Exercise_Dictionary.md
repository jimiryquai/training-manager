### AI Spec: Task 6 \- Progression-Based Exercise Dictionary & Testing

**1\. Why (Brief Context)**To accurately monitor strength training without overwhelming the athlete, we need an intelligent exercise library. Exercises must be categorized by movement pattern, assigned a progression level, and mathematically benchmarked against a "master" lift (e.g., a Goblet Squat represents 70% of a Back Squat). We must verify this relational logic via integration tests before building any UI.

**2\. What (Scope)**

* **Database Tables:** Create exercise\_dictionary and user\_benchmarks tables in D1.  
* **tRPC API:** Create libraryRouter.ts with queries/mutations to interact with these tables.  
* **Integration Tests:** Write Vitest tests to verify the schema, foreign keys, and tRPC endpoints function correctly against a local test database.

**3\. Constraints (Boundaries)**

* **Multi-tenancy:** Both tables MUST include a tenant\_id column to maintain strict SaaS data sharding.  
* **Self-Referencing FK:** The exercise\_dictionary must include an optional master\_exercise\_id that references another row in the same exercise\_dictionary table.  
* **Data Types:** progression\_level MUST be an INTEGER. conversion\_factor MUST be a REAL or FLOAT.  
* **Testing:** MUST use Vitest.  
* **Out of Scope:** Do not build the frontend UI for this task.

**4\. Tasks (Discrete Work Units)**

* **Task 1 (Database Migration):** Write and execute a standard SQL migration to create user\_benchmarks (id, tenant\_id, user\_id, master\_exercise\_name, one\_rep\_max\_weight, created\_at) and exercise\_dictionary (id, tenant\_id, name, movement\_category, progression\_level, master\_exercise\_id, conversion\_factor).  
* **Task 2 (Kysely Types):** Run the database type generation script (e.g., npm run db:types) so Kysely recognizes the new tables.  
* **Task 3 (Backend API):** Create src/trpc/routers/libraryRouter.ts. Add a query getExercisesByCategory and mutations addExercise and saveUserBenchmark.  
* **Task 4 (Vitest Integration):** Create tests/trpc/routers/libraryRouter.test.ts. Write a test that:  
* Inserts a master lift ("Back Squat") via the router.  
* Inserts a child lift ("Goblet Squat") referencing the master lift's ID with a 0.70 conversion factor.  
* Queries the dictionary to verify the relationship and conversion factor are returned successfully.  
* *Verify:* Run npm run test. All tests must pass, proving the database relations and API work perfectly without a UI.

