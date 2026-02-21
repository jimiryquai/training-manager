### AI Spec: Task 4 \- App Structure & Subjective Fatigue Metrics

**1\. Why (Brief Context)**

We are evolving the MVP from a single-page proof-of-concept into a mobile-friendly Progressive Web App (PWA) experience. Simultaneously, we are adding subjective fatigue metrics to our daily wellness logging to catch warning signs that objective heart-rate data might miss.

**2\. What (Scope)**

* **Database & API:** Add six new optional integer columns to the daily\_wellness table (sleep\_score, fatigue\_score, muscle\_soreness\_score, stress\_score, mood\_score, and diet\_score). Update the Kysely services and tRPC routers to accept these.

* **App Structure:** Implement an AppLayout component featuring a mobile-friendly navigation bar (e.g., bottom tab bar or top menu) with links to "Dashboard" and "Log Data".

* **Routing & SPA:** Split the current UI. The root route (/) will display the ACWR and Fatigue charts. A new route (/log) will display the forms. Enable RedwoodSDK's client-side navigation so moving between these tabs is instantaneous.

* **Form Update:** Update the LogWellnessForm to capture the new subjective metrics using a 1-5 scale hybrid approach (visual sliders with color-coded feedback).

**3\. Constraints (Boundaries)**

* **Data Types:** All six new scores MUST be stored as integer in the SQLite database (1-5 scale) and MUST be optional (nullable).

* **Routing Logic:** MUST use RedwoodSDK's layout() function in worker.tsx to wrap the routes in the new AppLayout.

* **SPA Navigation:** MUST configure initClientNavigation() in src/client.tsx to intercept link clicks and prevent full-page reloads. Links should be generated using linkFor() from rwsdk/router.

* **UI Components:** MUST use the shadcn/ui Slider component for the 1-5 scale inputs.

**4\. Tasks (Discrete Work Units)**

* **Task 1 (Database & API):** Write and run a D1 migration to add the six new integer columns to daily\_wellness. Update the Zod schema in wellnessRouter and the Kysely createDailyWellness service to handle these fields. Run npm run db:types.

* *Verify:* The backend TypeScript compiles and the local D1 database accepts the new columns.

* **Task 2 (App Layout & SPA Setup):** Create src/app/layouts/AppLayout.tsx containing a navigation bar with links to / and /log. Update src/client.tsx to initialize initClientNavigation(). Update worker.tsx to mount the routes inside layout(AppLayout, \[...\]).

* *Verify:* Client-side navigation intercepts link clicks without triggering a full browser refresh.

* **Task 3 (UI Split & Form Update):** Create a new LogData page component. Move the "Log Wellness" and "Log Workout" forms to this new page, mapped to the /log route. Keep the charts on the root / Dashboard page. Update the LogWellnessForm to include the six new subjective metric sliders (1-5 scale).

* *Verify:* Navigating between tabs works seamlessly. Submitting the updated wellness form successfully saves both the objective (HRV/RHR) and subjective data to the database.