# Training Manager

A SaaS-ready hybrid training manager for athletes. Tracks endurance and strength sessions under a unified training load model, while monitoring fatigue through daily wellness metrics.

## Features (Data Layer)

- **Unified Training Load**: All sessions calculate a "Training Load" score (duration × sRPE on Borg 1-10 scale)
- **Modality Categorization**: Sessions tagged by type (strength, rowing, running, cycling, swimming, other)
- **Fatigue & Readiness Tracking**: Manual logging of Resting Heart Rate (RHR) and Heart Rate Variability (HRV/rMSSD)
- **Strain Monitoring (ACWR)**: Acute:Chronic Workload Ratio comparing 7-day acute load vs 28-day chronic load with danger zone alerting (>1.5)

## Tech Stack

- **Framework**: [RedwoodSDK](https://docs.rwsdk.com/) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Query Builder**: Kysely
- **Testing**: Vitest
- **Auth**: Durable Objects (via `defineDurableSession`)

## Getting Started

```shell
npm install
npm run dev
```

Run tests:

```shell
npm test
```

## Project Structure

```
src/
├── db/
│   ├── schema.ts           # TypeScript types for Kysely
│   └── migrations/         # D1 SQL migrations
├── services/
│   ├── dailyWellness.service.ts   # HRV/RHR tracking
│   ├── workoutSession.service.ts  # Training sessions
│   ├── acwr.service.ts            # ACWR calculation
│   └── index.ts                   # Barrel exports
└── worker.tsx              # Cloudflare Worker entry point

tests/
├── db/schema.test.ts
└── services/
    ├── dailyWellness.service.test.ts
    ├── workoutSession.service.test.ts
    └── acwr.service.test.ts
```

## Business Rules

| Rule | Formula |
|------|---------|
| Training Load | `duration_minutes × sRPE` |
| HRV Ratio | `hrvRmssd / rhr` |
| Acute Load | 7-day rolling sum of training load |
| Chronic Load | 28-day rolling average of training load |
| ACWR | `acute_load / chronic_load` |
| Danger Zone | `ACWR > 1.5` |

## Roadmap

- [ ] Authentication (Durable Objects sessions)
- [ ] tRPC API routers
- [ ] Fate data fetching layer
- [ ] Frontend UI
- [ ] Expo mobile app

## Documentation

- [Product Requirements](docs/PRD_Training%20Manager.md)
- [Technical Design](docs/TDD_Training_Manager.md)
- [Implementation Plan](docs/plans/2026-02-21-database-schema-services.md)

## Further Reading

- [RedwoodSDK Documentation](https://docs.rwsdk.com/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)
- [Kysely Query Builder](https://kysely.dev/)
