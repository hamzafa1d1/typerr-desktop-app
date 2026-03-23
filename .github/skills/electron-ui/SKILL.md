---
name: electron-ui
description: "Use when: Electron renderer UI, shadcn/ui components, Radix primitives, Recharts dashboards, or Tailwind-based design system work. Covers UI refactors, chart integration, and cleanup of unused UI code."
---

# Electron UI Skill

## Purpose
Provide a consistent workflow for UI changes in the Electron renderer with shadcn-style components, Tailwind, and Recharts. Emphasize UX polish and cleanup of unused code.

## Workflow
1. Identify the renderer entry points and active dashboard components.
2. Prefer shadcn-style components in src/renderer/src/components/ui.
3. For charts, use Recharts with the local shadcn chart helper.
4. Keep Tailwind classes explicit (avoid dynamic class name strings that Tailwind cannot see).
5. Remove unused UI components, flags, and imports after refactors.
6. Validate with npm run build after UI changes.

## UX Guidelines
- Keep hierarchy clear: KPI chart summary + card detail rows.
- Use consistent spacing and typographic scale.
- Prefer subtle motion and keep animations predictable.

## Cleanup Checklist
- Remove unused components and exports.
- Remove unused feature flags.
- Remove dead imports in App and dashboard components.
- Validate build with typecheck.
