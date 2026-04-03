---
module: orchestration
problem_type: planning_error
tags: ["plan-review","boilerplate","middleware","dead-end","feasibility"]
---
### [2026-04-03] Validate whether repeated patterns are actually boilerplate before planning extraction units
When the ideation doc flags a "pattern" for extraction (e.g., repeated `tenant_id: ctx.tenantId` across routers), validate whether it's actually boilerplate BEFORE writing it as a plan unit. Ask: "Is this a necessary bridge between layers, or accidental duplication?"

In Phase 4, Unit 3 prescribed a tRPC middleware to auto-inject `tenant_id` into inputs. This was architecturally wrong — the 31 occurrences are the necessary bridge between tRPC context and service function inputs. No middleware can eliminate them without crashing no-input procedures or forcing Zod schema changes. The engineer spun for a full timeout cycle trying to make it work.

**The fix:** The second engineer correctly identified the pattern as already-optimal, documented the decision, and skipped the unit. 

**TDM lesson:** Validate the feasibility of each unit's proposed solution during plan writing. If a unit's solution requires changing fundamental data flow between layers, flag it as high-risk and test the concept before dispatching an engineer.

