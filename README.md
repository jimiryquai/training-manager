# Agent-Native AI Coaching Engine

A voice-first, AI-driven training partner built on Cloudflare Workers. It autonomously manages sports science periodization, tracking endurance and strength sessions under a unified training load model while dynamically autoregulating intensity based on daily wellness metrics.

## Tech Stack
*   **Framework:** RedwoodSDK on Cloudflare Workers
*   **Database:** Cloudflare D1 (SQLite) queried strictly via Kysely
*   **AI Orchestration:** Cloudflare `agents` package + Pi SDK
*   **Frontend:** Progressive Web App (PWA) using `useAgent` hook
*   **Testing:** Vitest (Strict TDD / Anti-Mock rule)

## Core Business Rules (Domain Logic)
The AI Coach utilizes the following formulas to manage the athlete's fatigue and training load:

| Rule | Formula |
| ------ | ------ |
| Training Load | duration_minutes × sRPE |
| HRV Ratio | hrvRmssd / rhr |
| Acute Load | 7-day rolling sum of training load |
| Chronic Load | 28-day rolling average of training load |
| ACWR | acute_load / chronic_load |
| Danger Zone | ACWR > 1.5 |

## Documentation
*   `PRD.md`: Product vision and scope.
*   `TDD.md`: Architecture and multi-tenant database design.
*   `AGENTS.md`: Strict system prompts and coding constraints for the Pi SDK.