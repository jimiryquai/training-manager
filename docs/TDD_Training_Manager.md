### Technical Design Document (TDD): Backend Architecture

**Stack:** RedwoodSDK, Cloudflare D1 (SQLite), tRPC, Kysely query builder, built-in Redwood dbAuth.

**Database Schema Design (Hybrid Model):**

* **User / Tenant**: Uses Redwood's standard dbAuth schema, but introduces a tenant\_id for future-proofing multi-tenancy sharding.  
* **DailyWellness**: Tracks Date, tenant\_id, RHR, and HRV (rMSSD). Includes a computed/service-layer calculation for HRV/RHR ratio.  
* **WorkoutSession**: The parent table for all training. Tracks Date, tenant\_id, modality\_type (Enum), duration\_minutes, sRPE (1-10), and a computed training\_load (duration \* sRPE).  
* *(Future)* StrengthDetails / EnduranceDetails: Child tables linking to WorkoutSession for modality-specific reporting (external load like kilos or splits).

**API Layer:**

* **Shared Kysely Services**: Core logic for calculating ACWR and unified training load must be abstracted into shared Kysely services. This ensures that when an Expo (Mobile) app is built later, it can consume the exact same logic.  
* **Data Fetching**: Fate will be used to safely compose and type-mask these views so the eventual UI can fetch all readiness data in a single request.