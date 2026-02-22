# Task Plan: Migrate shadcn from Radix UI to Base UI

## Goal
Replace Radix UI primitives with Base UI in shadcn components to future-proof the project, follow shadcn's direction of travel, and address licensing concerns.

## Current Phase
Phase 4 (complete)

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
- **Status:** complete

### Phase 2: Remove Existing Components
- [x] Delete all 9 components in `src/app/components/ui/`
- [x] Delete `radix-ui` from package.json
- **Status:** complete

### Phase 3: Reinstall Components
- [x] Run `pnpm dlx shadcn@latest add button card chart form input label select slider sonner`
- [x] Add `field` component (replaces `form` for Base UI - see deviation below)
- [x] Manually add `@base-ui/react: ^1.2.0` to package.json (CLI did not auto-add)
- [x] Run `pnpm install` to install Base UI
- **Status:** complete

**DEVIATION:** The `form` component was not installed. Base UI uses a different pattern - the `Field` component replaces the old Radix-style `form` wrapper. The old `form.tsx` integrated with react-hook-form using Radix primitives (`LabelPrimitive`, `Slot`). Base UI's `Field` component is a simpler, composition-based approach that works with any form library.

**DEVIATION:** The shadcn CLI did not auto-add `@base-ui/react` to package.json. Had to add manually.

**Components installed:**
- button, card, chart, input, label, select, slider, sonner (Base UI versions)
- field, separator (Base UI alternatives to form pattern)

### Phase 4: Verify & Clean Up
- [x] Run `pnpm install`
- [x] Run `pnpm run check` (typecheck)
- [x] Run `pnpm run build`
- [x] Refactor forms to use Base UI Field pattern with Controller
- **Status:** complete

**DEVIATION:** Forms needed significant refactoring. The old Radix-style `form.tsx` wrapper was deleted. Instead, Base UI uses a composition pattern with `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, and `FieldGroup` components combined with react-hook-form's `Controller`.

**Files modified:**
- `src/app/components/forms/LogWellnessForm.tsx` - Refactored to use Controller + Field
- `src/app/components/forms/LogWorkoutForm.tsx` - Refactored to use Controller + Field
- `src/app/components/ui/slider.tsx` - Added `rangeClassName` prop for compatibility

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
| Use Field pattern with Controller | Base UI doesn't have Radix-style form wrapper. Proper pattern is Controller + Field composition |
| Delete form.tsx wrapper | The old Radix-style Form/FormField/FormItem wrapper doesn't translate to Base UI. Use react-hook-form's Controller directly |
| Add rangeClassName to Slider | Preserve existing slider styling API used by wellness form |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- The `style` property in `components.json` determines which library components use
- Radix styles: `radix-nova`, `radix-vega`, `radix-maia`, `radix-lyra`, `radix-mira`
- Base UI styles: `base-nova`, `base-vega`, `base-maia`, `base-lyra`, `base-mira`
- Same style name (e.g., `nova`) = same visual appearance, different underlying primitives
