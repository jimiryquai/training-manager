# Design: App Structure & Subjective Fatigue Metrics

## Overview

Evolve the MVP from a single-page proof-of-concept into a mobile-friendly PWA with two-route navigation, while adding subjective fatigue metrics to daily wellness logging.

## Database Changes

Add six nullable integer columns to `daily_wellness` table (1-5 scale):

| Column | Type | Constraint |
|--------|------|------------|
| sleep_score | INTEGER | CHECK BETWEEN 1 AND 5 |
| fatigue_score | INTEGER | CHECK BETWEEN 1 AND 5 |
| muscle_soreness_score | INTEGER | CHECK BETWEEN 1 AND 5 |
| stress_score | INTEGER | CHECK BETWEEN 1 AND 5 |
| mood_score | INTEGER | CHECK BETWEEN 1 AND 5 |
| diet_score | INTEGER | CHECK BETWEEN 1 AND 5 |

All columns are nullable for backwards compatibility with existing data.

**Zod Schema:**
```typescript
sleep_score: z.number().min(1).max(5).optional()
// repeated for all 6 fields
```

**Service Layer:** `upsertDailyWellness` spreads optional fields into insert/update operations.

## App Layout & Routing

### AppLayout Component
- Fixed bottom tab bar (mobile-friendly, thumb-reachable)
- 2 tabs: Dashboard (/) and Log Data (/log)
- Icons: LayoutDashboard, ClipboardList (lucide-react)
- Active state with current route detection
- Bottom padding on main content to avoid tab bar overlap

### Routing Structure
```tsx
render(Document, [
  layout(AppLayout, [
    route("/", Dashboard),
    route("/log", LogData),
  ])
])
```

### SPA Navigation
- Already configured via `initClientNavigation()` in client.tsx
- Links use `linkFor()` from `rwsdk/router` for instant transitions

## UI Components

### Slider-Based Subjective Metrics
- Component: shadcn/ui Slider
- Color-coded feedback: red (1) → yellow (3) → green (5)
- Labels with emoji indicators:
  - 😴 Sleep Quality
  - 🔋 Fatigue Level
  - 💪 Muscle Soreness
  - 😰 Stress Level
  - 😊 Mood
  - 🍎 Diet Quality

### Page Structure

**Dashboard (/)**:
- ACWRChart
- FatigueChart  
- Current ACWR Status Card

**Log Data (/log)**:
- LogWellnessForm (with subjective sliders)
- LogWorkoutForm

## Dependencies to Add
- shadcn/ui Slider component: `npx shadcn@latest add slider`
