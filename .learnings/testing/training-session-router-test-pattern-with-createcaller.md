---
module: testing
problem_type: best_practice
tags: ["router-testing","vitestInvoke","createCaller","multi-tenant","tRPC"]
---
### [2026-04-03] Training Session Router Test Pattern with createCaller
### [2026-04-03] Training Session Router Integration Test Pattern

When adding router-level integration tests for trainingSessionRouter (or any tRPC router):

## 1. Test Utilities Setup

Add router-level test utilities to `src/app/test-utils.ts`:

```typescript
import { trainingSessionRouter } from "../trpc/routers/trainingSessionRouter";

function createSessionCaller(tenantId: string, userId: string = 'test-user') {
    const db = getDb();
    return trainingSessionRouter.createCaller({
        session: { userId, tenantId },
        tenantId,
        userId,
        db,
    });
}

export async function test_ts_createSession(input: {...}) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.createSession({...});
}
// Repeat for all router procedures...
```

## 2. Test File Structure

Create `tests/trpc/routers/trainingSessionRouter.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TENANT_A = 'tenant-session-a';
const TENANT_B = 'tenant-session-b';

describe('trainingSessionRouter - Integration Tests', () => {
  let planA: { id: string };
  let exerciseDict: { id: string };

  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TENANT_A);
    await vitestInvoke('test_cleanTrainingPlanData', TENANT_A);
    // Create parent plan + exercise dictionary entries...
  });

  describe('Session CRUD', () => {
    // Tests for createSession, getSession, etc.
  });

  describe('Exercise CRUD', () => {
    // Tests for createExercise, getExercise, etc.
  });

  describe('Multi-tenant isolation (router level)', () => {
    // Cross-tenant access denial tests
  });
});
```

## 3. Key Patterns

- **Parent Data Setup**: `beforeEach` creates parent plan + exercise dictionary
- **Multi-Tenant Isolation**: Every procedure tested with cross-tenant access
- **Cascade Delete**: Verify session delete cascades to exercises
- **Grouped Queries**: Test `getExercisesGrouped` with 'ungrouped' key for null circuit_group

## 4. Build Required

After adding test utilities to `test-utils.ts`, rebuild the worker:
```bash
npx vite build --mode development
npx vitest run tests/trpc/routers/trainingSessionRouter.test.ts
```

## 5. Anti-Mock Rule Compliance

All tests use real D1 database via `vitestInvoke` → `createCaller` pattern. No mocks.

