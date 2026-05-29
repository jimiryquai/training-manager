---
module: testing
problem_type: best_practice
tags: ["trainingRouter","dashboardRouter","integration-tests","vitestInvoke","real-D1"]
---
### [2026-04-03] Wave 2 Testing Pattern - Training and Dashboard Router Integration Tests
## Wave 2 Testing Units (3, 4, 5) - Integration Test Patterns

### Unit 3: trainingRouter Integration Tests

**File created:** `tests/trpc/routers/trainingRouter.test.ts`

7 procedures tested with real D1:
- `logSession` - creates workout sessions with calculated `training_load` (duration * srpe)
- `updateSession` - partial updates with automatic load recalculation
- `getSession` - fetch by ID with tenant isolation
- `getSessionsByDateRange` - date range queries
- `getACWRStatus` - ACWR calculation for a date
- `logSessionViaAgent` - creates with `is_voice_entry=1` and `agent_interaction_log`
- `markAsVoiceEntry` - marks existing session as voice entry

**Key schema fields:**
- `training_load` (not `load`) - calculated as duration_minutes * srpe
- `is_voice_entry` (0 or 1) - not `data_source` string
- `agent_interaction_log` - JSON string containing reasoning

### Unit 4: dashboardRouter Mock-to-Real-D1 Rewrite

**File rewritten:** `tests/fate/dashboardRouter.test.ts`

Key pattern: Use direct service calls when user_id must match across utilities:
```typescript
// Use test_createDailyWellness (direct service) instead of test_w_logDailyMetrics (router)
// because router utilities use a fixed WELLNESS_TEST_USER while dashboard uses TRAINING_TEST_USER
await vitestInvoke('test_createDailyWellness', {
    tenant_id: TEST_TENANT,
    user_id: TEST_USER,  // Must match dashboard user
    date: '2026-04-01',
    rhr: 55,
    hrv_rmssd: 45,
});
```

Schema constraint: `history_days` minimum is 7 (zod validation: `.min(7).max(90)`)

### Unit 5: False-Confidence Test Removal

**File edited:** `tests/agent/CoachAgent.test.ts`

Removed tests that asserted inline constants equal themselves:
```typescript
// REMOVED - Tests nothing
const expectedErrorStructure = { type: 'error', code: 'AI_ERROR' };
expect(expectedErrorStructure.type).toBe('error');  // Circular assertion
```

These tests provided zero coverage - they just verify JavaScript object assignment works.

### Test Utilities Added (src/app/test-utils.ts)

- `test_tr_logSession` - router-level with createCaller
- `test_tr_updateSession`
- `test_tr_getSession`
- `test_tr_getSessionsByDateRange`
- `test_tr_getACWRStatus`
- `test_tr_logSessionViaAgent`
- `test_tr_markAsVoiceEntry`
- `test_dash_getReadinessView`
