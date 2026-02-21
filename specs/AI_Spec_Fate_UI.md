  
AI Spec: Task 3 \- Fate Composition & Frontend UI (Readiness Dashboard) 

**1\. Why (Brief Context):**

 The foundational backend data and API layers are complete. We now need to build the "Readiness Dashboard" UI. To ensure the frontend is fast and lightweight, we will first use Fate to compose a unified data view on the backend, and then build the UI using Tailwind CSS v4 and shadcn/ui. 

**2\. What (Scope)** **Backend:**

Install Fate (fate.technology) and create a ReadinessView that composes the user's current ACWR status and their historical daily wellness metrics (HRV/RHR) into a single typed object. Expose this view via a new tRPC endpoint.

**Frontend Setup:** 

Configure Tailwind CSS v4 and initialize shadcn/ui within the RedwoodSDK project.

**Frontend Components:**

* Build "Log Wellness" and "Log Workout" forms.  
* Build the ReadinessDashboard view containing an **ACWR Chart** (showing the workload ratio and a 1.5 danger reference line) and a **Fatigue Chart** (a dual-axis line chart overlaying HRV and RHR trends). 

**3\. Constraints (Boundaries)** \* **Data Composition:** 

MUST use Fate for the backend view composition. Do not manually stitch objects together in the tRPC router without Fate's strict type masking.

**Styling:** MUST use Tailwind CSS v4 and shadcn/ui. When initializing shadcn/ui, the components.json aliases MUST be configured to use @/app/... to match RedwoodSDK conventions (e.g., "components": "@/app/components").

**Data Fetching:** The dashboard UI MUST fetch all of its data in a single request using the new Fate-powered tRPC hook. Do not write raw fetch calls.

**Interactivity:** Because these are interactive forms and charts, the React components must include the "use client" directive at the top of the file.

**Out of Scope:** Do not build complex authentication UI (login/signup screens). Assume the user is authenticated via the Durable Object session we built in Task 2\. 

**4\. Tasks (Discrete Work Units)** 

**Task 1 (Fate & API):** Install the Fate package. Create a backend ReadinessView using Fate that composes the output of the calculateACWR service and the getDailyWellness service. Update the tRPC router to expose a single query (e.g., dashboard.getReadinessView) that returns this composed payload. \* *Verify:* Write a test verifying the tRPC endpoint successfully returns the composed, strictly-typed Fate view.

**Task 2 (Frontend Setup):** Install and configure Tailwind CSS v4 and shadcn/ui. Add the required UI components via the shadcn CLI (form, input, button, select, card, chart, toast). \* *Verify:* The app runs without CSS errors and the components.json aliases correctly map to src/app/components/ui.

**Task 3 (Forms):** Build the LogWellnessForm and LogWorkoutForm client components using shadcn/ui forms and Zod validation. Connect their submit handlers to the respective tRPC mutations. \* *Verify:* Submitting the forms successfully inserts data into the database and triggers a success toast.

**Task 4 (Charts & Dashboard):** Build the ReadinessDashboard page. It must fetch the ReadinessView via the single tRPC query. Use the shadcn \`\` primitive to build the ACWRChart (including a warning line at 1.5) and the FatigueChart (plotting HRV and RHR). \* *Verify:* The dashboard successfully renders all charts and forms on the screen using the composed data.  
