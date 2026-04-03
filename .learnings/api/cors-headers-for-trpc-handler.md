---
module: api
problem_type: config
tags: ["CORS","tRPC","preflight","OPTIONS"]
---
### [2026-04-03] CORS Headers for tRPC Handler
## CORS Configuration for tRPC

CORS headers are added directly to the tRPC handler to support cross-origin requests.

### Headers Added
- `Access-Control-Allow-Origin: *` (hardcoded, env var suggested but not required)
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

### OPTIONS Preflight
Handler responds to OPTIONS requests with CORS headers for preflight support.

### Note
- Current implementation uses `*` for origin
- Environment variable configuration recommended for production
- Applied to tRPC fetch handler, not global middleware

