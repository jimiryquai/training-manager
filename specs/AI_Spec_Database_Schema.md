### 1\. The "1RM" Problem (Time vs. Weight)

In barbell training, the ultimate benchmark is always a 1 Rep Max (1RM) measured in kilos or pounds. However, OG explicitly states that for isometric strength (like the Planche, Front Lever, or Back Lever), the benchmark is "maximum hold time," measured in seconds 1\.

* **The Tweak:** If an athlete's benchmark for a "Planche" is a 15-second hold, our user\_benchmarks table cannot have a column named one\_rep\_max\_weight. We need to rename it to a generic benchmark\_value (REAL) and add a benchmark\_unit (TEXT: e.g., 'kg', 'lbs', 'seconds'). This allows your database to seamlessly handle both a 100kg Back Squat and a 20-second Front Lever hold.

### 2\. Identifying the Movement Type (Dynamic vs. Isometric)

OG categorizes all strength exercises into three distinct types: concentric (dynamic/moving), isometric (static holds), and eccentric (slow lowering) 2\.

* **The Tweak:** We need to add an exercise\_type column (TEXT) to our exercise\_dictionary to flag whether an exercise is 'dynamic', 'isometric', or 'eccentric'.  
* *Why this matters later:* When we eventually build the UI for your athletes to log their sessions, the app will read this column. If the exercise is 'dynamic' (like a pushup), the app will ask for "Reps". If it is 'isometric' (like an L-Sit), the app will automatically switch the UI to ask for "Hold Time (Seconds)".

### What *Doesn't* Need Tweaking (We got this right\!)

* **The Levels:** OG uses a specific 1-16 difficulty scale spanning Beginner (Levels 1-5), Intermediate (Levels 6-9), Advanced (Levels 10-13), and Elite (Levels 14-16) 3\. Our progression\_level INTEGER column handles this flawlessly.  
* **Lateralizations:** You mentioned having slightly different moves at the same level. Because our benchmark\_target is an abstract string (e.g., "Squat" or "Planche"), you can have five different Level 3 Planche variations all perfectly calculating their goals off the same master Planche benchmark.

### The Revised Task 6 AI Spec

Here is the slightly tweaked version of the spec, made entirely "bodyweight agnostic" so it supports both your *Strength Card Builder* math and the *Overcoming Gravity* isometric progressions.  
**You can copy and paste this straight to OpenCode:**

### AI Spec: Task 6 \- Hybrid Exercise Dictionary & Benchmarks

**1\. Why (Brief Context)**To accurately monitor strength training across both barbell and bodyweight disciplines, we need an intelligent exercise library. Exercises must be categorized by movement pattern, assigned a progression level, and mathematically benchmarked against an abstract top-level category (e.g., a Goblet Squat is 70% of a "Squat", a Tuck Planche is a progression of the "Planche"). Because bodyweight isometrics use "Time" instead of "Weight" as a metric, our benchmarks must be unit-agnostic. We must verify this logic via integration tests before building UI.  
**2\. What (Scope)**

* **Database Tables:** Create exercise\_dictionary and user\_benchmarks tables in D1.  
* **tRPC API:** Create libraryRouter.ts with queries/mutations to interact with these tables.  
* **Integration Tests:** Write Vitest tests to verify the schema and tRPC endpoints function correctly against a local test database.

**3\. Constraints (Boundaries)**

* **Multi-tenancy:** Both tables MUST include a tenant\_id column to maintain strict SaaS data sharding.  
* **Abstract Benchmarks:** The exercise\_dictionary will use a simple text string (benchmark\_target) instead of a foreign key to link to a master category.  
* **Unit-Agnostic Validation:** Benchmarks must support different units (e.g., 'kg', 'lbs', 'seconds').  
* **Testing:** MUST use Vitest. Focus strictly on backend logic; do not build frontend UI for this task.

**4\. Tasks (Discrete Work Units)**

* **Task 1 (Database Migration):** Write and execute a standard SQL migration to create:  
* user\_benchmarks (id, tenant\_id, user\_id, benchmark\_name TEXT, benchmark\_value REAL, benchmark\_unit TEXT, created\_at).  
* exercise\_dictionary (id, tenant\_id, name, movement\_category TEXT, progression\_level INTEGER, exercise\_type TEXT, benchmark\_target TEXT, conversion\_factor REAL). *(Note: exercise\_type should support 'dynamic', 'isometric', or 'eccentric').*  
* **Task 2 (Kysely Types):** Run the database type generation script (e.g., npm run db:types) so Kysely recognizes the new tables.  
* **Task 3 (Backend API):** Create src/trpc/routers/libraryRouter.ts. Add a query getExercises and mutations addExercise and saveUserBenchmark.  
* **Task 4 (Vitest Integration):** Create tests/integration/libraryRouter.test.ts. Write a test that:  
* Inserts a user benchmark for an Isometric hold ("Planche" \= 15, unit: "seconds").  
* Inserts a child bodyweight exercise ("Tuck Planche") with exercise\_type \= "isometric", benchmark\_target \= "Planche", and conversion\_factor \= 1.0.  
* Queries the dictionary to verify the data was saved successfully.  
* *Verify:* Run npm run test. All tests must pass, proving the database relations and API work perfectly for both weighted and time-based modalities.

With those tweaks, your app is fully prepared to handle the complexities of both powerlifting math and elite gymnastics periodization. Let me know when you fire this off\!  
