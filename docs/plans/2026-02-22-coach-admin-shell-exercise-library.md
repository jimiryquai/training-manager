# Implementation Plan: Coach Admin Shell & Exercise Library

## Overview
We will implement the Coach Admin Shell as a distinct render tree within `src/worker.tsx` to strictly separate the desktop experience from the athlete's PWA. This includes a new layout, security middleware, and the first admin page: the Exercise Library.

## Proposed Changes

### 1. Admin Architecture (`src/admin/`)
- **[NEW] `src/admin/Document.tsx`**: A dedicated HTML document shell for the coach interface, preventing the mobile PWA styles and behaviors from leaking into the admin app.
- **[NEW] `src/admin/layouts/CoachLayout.tsx`**: A desktop-friendly sidebar layout. It will feature a left sidebar navigation with a link to "Exercise Library" (using `lucide-react` icons) and a main content area for the admin dashboards.

### 2. Security Middleware
- **[NEW] `src/admin/interrupters.ts`**: Create a `requireCoach` middleware function. Initially, this will simply verify that `ctx.session` is present and return a `401 Unauthorized` or redirect if the user is unauthenticated. This will act as a guard for the entire `/coach` route tree.

### 3. Route Registration
- **[MODIFY] `src/worker.tsx`**: 
  - Import the new `CoachDocument`, `CoachLayout`, `LibraryPage`, and `requireCoach` interceptor.
  - Import `prefix` from `rwsdk/router`.
  - Add a second `render(CoachDocument, [...])` block inside `defineApp`.
  - Mount a `prefix('/coach', [requireCoach, layout(...)])` router to encapsulate all admin routes.
  - Register the `/coach/library` route inside this prefix block.

### 4. Exercise Library UI
- **[NEW] `src/admin/pages/library/LibraryPage.tsx`**:
  - The UI will consist of a header, a form/dialog to add a new Master Lift, and a `shadcn/ui` Table to display the existing `exercise_dictionary`.
  - We will fetch the existing exercises and add new ones using the tRPC router (which was built in Task 6).
  - The form for new Master Lifts will take simple inputs (e.g., name: "Back Squat", level: 5).

## Verification Plan

### Automated Tests
- **Security Check:** Write a Vitest integration test leveraging the RedwoodSDK `/_test` bridge pattern. We will simulate a request to `/coach/library` without a session and verify it is rejected.
- **Data Fetch:** Write a test simulating a request to `/coach/library` with an active mock session and verify it successfully returns the page content or properly loads the `exercise_dictionary` via the tRPC router context.
- **Command:** We will run `npm run test` to verify our integration tests execute correctly.

### Manual Verification
- **Dev Login:** Navigate to `/dev-login` to get a local session, then visit `/coach/library` in the browser to ensure the layout renders the sidebar properly and the data table is populated. Ensure navigation intercepts work as expected.
