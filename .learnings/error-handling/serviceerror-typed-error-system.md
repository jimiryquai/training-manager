---
module: error-handling
problem_type: best_practice
tags: ["ServiceError","typed-errors","tRPC","error-codes"]
---
### [2026-04-03] ServiceError Typed Error System
## ServiceError Class - Typed Error Codes

The project uses a `ServiceError` class for structured error handling with typed error codes.

### Error Codes
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Authentication/authorization failure
- `VALIDATION_ERROR` - Input validation failure
- `DATABASE_ERROR` - Database operation failure

### Usage Pattern
```typescript
throw new ServiceError('NOT_FOUND', 'Athlete not found', { athleteId });
```

### Benefits
- Consistent error structure across services
- Type-safe error codes (no magic strings)
- Rich context for debugging
- Enables automatic tRPC error mapping in middleware

