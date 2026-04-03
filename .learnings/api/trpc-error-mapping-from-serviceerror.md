---
module: api
problem_type: best_practice
tags: ["tRPC","error-mapping","middleware","ServiceError"]
---
### [2026-04-03] tRPC Error Mapping from ServiceError
## ServiceError → tRPC Error Code Mapping

tRPC middleware automatically maps `ServiceError` codes to tRPC error codes.

### Mapping Table
| ServiceError Code | tRPC Error Code |
|-------------------|-----------------|
| NOT_FOUND         | NOT_FOUND       |
| UNAUTHORIZED      | UNAUTHORIZED    |
| VALIDATION_ERROR  | BAD_REQUEST     |
| DATABASE_ERROR    | INTERNAL_SERVER_ERROR |

### Implementation Location
Error mapping happens in tRPC middleware - services throw `ServiceError`, middleware catches and converts.

### Benefits
- Services remain framework-agnostic
- Consistent client-side error handling
- Proper HTTP status codes via tRPC

