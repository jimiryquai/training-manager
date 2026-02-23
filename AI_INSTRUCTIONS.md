### AI\_INSTRUCTIONS.md

**1\. Tech Stack & Architecture**

* **Framework:** RedwoodSDK (Cloudflare Workers runtime). Adhere strictly to "Zero Magic" principles: use native Web APIs (Request, Response, Fetch) instead of framework-specific wrappers.  
* **Database:** Cloudflare D1 (SQLite) queried strictly via **Kysely**. Do NOT use Prisma Client for queries.  
* **Multi-tenancy:** ALL core backend tables and tRPC routers MUST enforce a tenant\_id string column extracted from the Durable Object session.  
* **Frontend:** React Server Components (RSC) by default. Use the "use client" directive only when interactivity is strictly required.  
* **Styling & UI:** Tailwind CSS v4 and shadcn/ui. **CRITICAL: For shadcn/ui components, you MUST use Base UI primitives. Do NOT use Radix UI primitives.** Use @/app/... aliases for component imports.  
* **API:** End-to-end type-safe tRPC routers securely guarded by the multi-tenant session context.

**2\. Testing Methodology (Strict TDD & High Fidelity)**

1. **Framework:** Vitest.  
2. **The "Anti-Mock" Rule:** Aim for maximum test fidelity. Do NOT mock the database, Kysely services, or tRPC routers. You must write true integration tests that verify actual data flow.  
3. **Backend Integration:** Use the RedwoodSDK "Test Bridge" pattern (/\_test route) to test server actions and tRPC routers inside the isolated worker context using the vitestInvoke helper. These tests must execute against the real, local Cloudflare D1 testing database.  
4. **The TDD Workflow:** You must strictly follow this order for all tasks:  
5. Write the failing integration test.  
6. Run the test to verify it fails.  
7. Write the minimal implementation.  
8. Run the test to verify it passes.

**3\. Execution Rules (Spec-Driven Development)**

* You will be provided with a 4-part AI Spec (Why, What, Constraints, Tasks).  
* Follow the constraints strictly. Do not add unexpected features, files, or surprise dependencies outside of the defined scope.  
* Work task-by-task. Verify the outcome of each task before proceeding to the next one.

