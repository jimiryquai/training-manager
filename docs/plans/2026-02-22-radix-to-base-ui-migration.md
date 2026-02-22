# Task Plan: Migrate shadcn from Radix UI to Base UI

## Goal
Replace Radix UI primitives with Base UI in shadcn components to future-proof the project, follow shadcn's direction of travel, and address licensing concerns.

## Current Phase
Phase 1 (in progress)

## Context

### Why This Migration?
1. **Licensing concerns** - Radix UI recently changed license
2. **Better DX/API** - Base UI primitives feel cleaner
3. **Shadcn's direction** - shadcn now supports both Radix and Base UI
4. **Future-proofing** - Base UI is where the ecosystem is heading

### Current State
- **Style:** `radix-nova` in `components.json`
- **Components installed:** 9 total
  - `button.tsx` - No primitives (pure CSS)
  - `card.tsx` - No primitives (pure CSS)
  - `chart.tsx` - No primitives (recharts)
  - `form.tsx` - **Uses Radix** (`LabelPrimitive`, `Slot` from `radix-ui`)
  - `input.tsx` - No primitives (pure CSS)
  - `label.tsx` - No primitives (pure CSS)
  - `select.tsx` - **Uses Radix** (`Select as SelectPrimitive` from `radix-ui`)
  - `slider.tsx` - **Uses Radix** (`Slider as SliderPrimitive` from `radix-ui`)
  - `sonner.tsx` - No primitives (sonner package)
- **Dependencies:** `radix-ui: ^1.4.3` in package.json

### Target State
- **Style:** `base-nova` (same visual style, different primitives)
- **Dependencies:** `@base-ui/react` instead of `radix-ui`

## Phases

### Phase 1: Update Configuration
- [x] Change `style` in `components.json` from `radix-nova` to `base-nova`
- **Status:** in_progress

### Phase 2: Remove Existing Components
- [ ] Delete all 9 components in `src/app/components/ui/`
- [ ] Delete `radix-ui` from package.json
- **Status:** pending

### Phase 3: Reinstall Components
- [ ] Run `pnpm dlx shadcn@latest add button card chart form input label select slider sonner`
- [ ] Verify `@base-ui/react` added to dependencies
- **Status:** pending

### Phase 4: Verify & Clean Up
- [ ] Run `pnpm install`
- [ ] Run `pnpm run check` (typecheck)
- [ ] Run `pnpm run build`
- [ ] Verify app loads correctly
- **Status:** pending

## Key Questions
1. ~~What components use Radix primitives?~~ ANSWERED: select, form, slider
2. ~~What's the equivalent Base UI style?~~ ANSWERED: `base-nova`
3. Will the CLI auto-detect and install `@base-ui/react`? TO BE VERIFIED

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use `base-nova` style | Maintains same visual style as `radix-nova`, just swaps primitives |
| Full reinstall vs manual migration | Simpler, less error-prone. CLI generates correct code automatically |
| Keep all 9 components | All are needed; no components to remove |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- The `style` property in `components.json` determines which library components use
- Radix styles: `radix-nova`, `radix-vega`, `radix-maia`, `radix-lyra`, `radix-mira`
- Base UI styles: `base-nova`, `base-vega`, `base-maia`, `base-lyra`, `base-mira`
- Same style name (e.g., `nova`) = same visual appearance, different underlying primitives
