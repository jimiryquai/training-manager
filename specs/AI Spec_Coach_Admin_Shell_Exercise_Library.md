### AI Spec: Task 7 \- The Coach Admin Shell & Exercise Library

**1\. Why (Brief Context)**We need to strictly separate the Athlete's mobile logging experience from the Coach's desktop planning experience. Using RedwoodSDK's multi-render architecture, we will create a dedicated /coach route tree 1, 2\. This ensures the heavy desktop UI components don't bloat the athlete's mobile PWA, and allows us to build an interface to manage the newly created exercise\_dictionary.

**2\. What (Scope)**

* **Split Routing Architecture:** Implement a separate CoachDocument and CoachLayout for the admin surface 2\.  
* **Security:** Create a requireCoach interrupter to securely gate all routes under the /coach prefix 3, 4\.  
* **UI (Exercise Library):** Build the first Coach page (/coach/library) to display and add master lifts to the exercise\_dictionary using the tRPC router built in Task 6\.  
* 

**3\. Constraints (Boundaries)**

* **Global Rules:** You MUST strictly follow all architectural, state management, and anti-mock testing rules defined in AI\_INSTRUCTIONS.md.  
* **Framework:** MUST use RedwoodSDK's defineApp with multiple render() calls in src/worker.tsx to separate the app and admin route trees 2\.  
* **Components:** Admin-specific UI components should live under src/admin/ to prevent bleeding into the src/app/ bundle.  
* 

**4\. Tasks (Discrete Work Units)**

* **Task 1 (Admin Architecture):** Create src/admin/Document.tsx and src/admin/layouts/CoachLayout.tsx. The layout should feature a desktop-friendly sidebar navigation with a link to "Exercise Library".  
* **Task 2 (Security Interrupter):** Create src/admin/interrupters.ts and define a requireCoach middleware function. For now, it should verify a valid ctx.session exists before allowing access (we will add strict role-based access control later) 4\.  
* **Task 3 (Route Registration):** Update src/worker.tsx. Inside defineApp, add a second render(CoachDocument, \[...\]) block. Mount a prefix('/coach', \[requireCoach, ...\]) router that includes a route for the library 4, 5\.  
* **Task 4 (Exercise Library UI):** Create src/admin/pages/library/LibraryPage.tsx. Use a shadcn/ui Table to fetch and display the current exercise\_dictionary. Include a simple form to add a new Master Lift (e.g., "Back Squat", "Level 5").  
* *Verify:* Write a high-fidelity integration test using the /\_test bridge verifying that navigating to a /coach route without a session is blocked, and that the library page correctly fetches data.

