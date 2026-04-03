---
module: frontend
problem_type: gotcha
tags: ["tRPC","frontend","raw-fetch","assumption"]
---
### [2026-04-03] Frontend Used Raw Fetch Not tRPC Client — Migration Mapping Was Unnecessary
### [2026-04-03] Phase 2: Frontend tRPC Client Assumption Was Wrong
## Frontend Used Raw Fetch, Not tRPC Client

### The Gotcha
During Phase 2 planning, a "migration mapping" was created for frontend route changes (e.g., `trainingPlan.createSession` → `trainingSession.createSession`). This mapping assumed the frontend used the tRPC client library (`trpc.trainingPlan.createSession.mutate()`).

### Reality
The frontend used **raw `fetch()` calls** directly to tRPC HTTP endpoints (e.g., `fetch('/api/trpc/trainingPlan.createSession')`). This meant:
- Route path changes only required updating string URLs, not client syntax
- No tRPC client re-initialization or type regeneration was needed
- The migration mapping document was unnecessary overhead

### Lesson
**Verify the frontend's actual API consumption pattern before planning migration strategies.** Don't assume the canonical client library is in use. Check:
1. `grep -r "trpc\." src/` — tRPC client syntax
2. `grep -r "fetch(" src/` — raw HTTP calls
3. `grep -r "useMutation\|useQuery" src/` — React Query hooks (may or may not use tRPC)

### Impact
For this project: low (extra planning doc, no code harm). For projects with public APIs: could lead to unnecessary versioning complexity.
