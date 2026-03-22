# Typerr UX Investigation Plan (2026)

## Purpose
Shift Typerr from a background utility into a premium coaching desktop experience by validating modern UI and interaction strategies before full implementation.

## Product Goal
Create a tactile, high-trust, high-performance desktop UX that helps users improve typing with minimal interruption.

## North-Star Outcomes
- Increase weekly active usage of dashboard and coaching features.
- Improve return rate after first-run onboarding.
- Increase completion of permission flow and first tracked session.
- Reduce user confusion about what to do next in low-data states.
- Keep desktop feel responsive under all animations and overlays.

## Success Metrics
- First-value time: user reaches first actionable insight within 90 seconds.
- Permission completion rate: Accessibility flow completion above 80 percent in first session.
- Insight engagement: at least 40 percent of active users trigger Smart Audit weekly.
- Performance: animation frame pacing remains smooth during dashboard interactions.
- Stability: no blocking UI regressions in tray-first usage.

## Investigation Streams

### Stream A: Glass and Depth Visual Language
Hypothesis:
A refined glass-depth system will make Typerr feel native and premium while improving information hierarchy.

Experiments:
1. Compare three styles:
- Flat dark cards (baseline)
- Soft glass cards with translucent layers
- Glass plus depth cues based on active/inactive window state
2. Bento grid alternatives for dashboard cards:
- Current two-column split
- Dense bento with variable card spans
- Adaptive bento by data availability

Validation:
- 5-second comprehension test: can users identify WPM, risk, and next action quickly?
- Preference ranking from internal dogfooding sessions.

Implementation notes:
- Start in renderer layout and card variants.
- Keep main process changes minimal except window active/inactive depth signal.

### Stream B: Invisible-First Utility UX
Hypothesis:
A spotlight-style quick reveal and tray micro-feedback improve utility feel without adding friction.

Experiments:
1. Global hotkey overlay entry (for example command+option+t).
2. Tray icon micro-animation for milestones (new personal best).
3. Non-intrusive local toast pattern with keyboard dismiss affordance.

Validation:
- Time to open dashboard from active workflow.
- Rate of accidental interruptions.
- User sentiment on “out of the way” behavior.

Implementation notes:
- Main process hotkey registration and overlay window mode.
- Renderer: compact overlay variant and reduced chrome.

### Stream C: Onboarding to Value
Hypothesis:
A narrative permission flow plus immediate progress states increases first-session activation.

Experiments:
1. Permission Story panel with rationale and visual explanation.
2. Empty-state progression block:
- Learning progress indicator
- Session streak starter
- First coaching hint before enough history exists
3. Milestone moments with kinetic text for meaningful achievements.

Validation:
- Permission funnel completion.
- Drop-off between first launch and first 2 minutes.
- Number of users reaching first “improve now” recommendation.

Implementation notes:
- Keep permission screen in main process but move to richer renderer-powered modal window.
- Add empty-state component variants in dashboard module.

### Stream D: Motion System (motion.dev / Framer Motion)
Hypothesis:
A coherent motion language improves clarity and delight when transitions stay under strict timing budgets.

Motion principles:
- Fast feedback: 120-220ms for micro transitions.
- Spatial continuity: cards move from known origin.
- Reduced noise: only animate meaning-bearing elements.

Experiments:
1. Entry choreography for bento cards (staggered, low amplitude).
2. KPI change transitions using number morphing.
3. Audit narrative reveal tied to scroll position.

Validation:
- Subjective smoothness rating in user tests.
- Performance traces under frequent updates.

Implementation notes:
- Centralize motion tokens and transition presets.
- Add reduced-motion support.

### Stream E: Design-to-Dev Efficiency
Hypothesis:
A formal design token layer and component boundaries will speed iteration and reduce regressions.

Actions:
1. Define tokens for color, radius, blur, elevation, spacing, motion.
2. Keep primitives in ui folder and feature cards in dashboard folder.
3. Use icon and component conventions consistently.

Validation:
- Time to ship new dashboard card.
- Reduced style drift across screens.

## Technical Spikes

### Spike 1: Active vs Inactive Window Depth
Goal:
Determine whether Electron window focus events can drive visual depth state reliably.

Deliverable:
- Small proof of concept with focus/blur classes reflected in renderer.

### Spike 2: Global Hotkey Overlay
Goal:
Validate spotlight-like summon behavior and focus management.

Deliverable:
- Toggleable centered overlay with keyboard-first navigation.

### Spike 3: Tray Milestone Feedback
Goal:
Test subtle tray feedback without distraction.

Deliverable:
- Trigger on personal-best event and measure perceived usefulness.

### Spike 4: Local Toast Pattern
Goal:
Prototype non-intrusive toast with keyboard dismiss.

Deliverable:
- Escape-key double tap dismiss behavior and timeout policy.

## Research and Testing Plan

### Method Mix
1. Rapid heuristic review with desktop UX checklist.
2. Internal dogfooding sessions with task scripts.
3. Lightweight moderated tests with 5 to 8 users.
4. Telemetry review for activation and retention proxies.

### Core Tasks for Test Sessions
1. Launch app from tray and open audit quickly.
2. Understand current performance and top risk in under 10 seconds.
3. Complete permission flow from cold start.
4. Interpret Smart Audit recommendations and select next action.

## Performance Guardrails
- Prioritize UI responsiveness over animation complexity.
- Prevent layout thrash during live stat updates.
- Keep transitions short and cancelable.
- Avoid expensive effects on low-power states.
- Validate reduced-motion behavior.

## Architecture Guardrails
- Keep business logic in main and analysis modules.
- Keep renderer modular: no single large page file growth.
- Expose only minimal preload APIs for new UI actions.
- Feature-flag experimental UX so rollout remains safe.

## Proposed Milestone Timeline

### Week 1: Baseline and Design Tokens
- Capture baseline metrics and UX pain points.
- Define motion and visual tokens.
- Finalize experiment matrix.

### Week 2: Visual and Layout Prototypes
- Build glass-depth and bento variants.
- Run first comprehension tests.

### Week 3: Invisible-First Interaction Spikes
- Implement hotkey overlay and tray micro-feedback spikes.
- Validate interruption profile.

### Week 4: Onboarding and Empty States
- Add permission story and first-value flow.
- Test first 60-second journey.

### Week 5: Motion Polish and Hardening
- Consolidate motion presets.
- Run performance and regression passes.
- Select rollout candidate.

## Deliverables
1. UX decision log with accepted and rejected patterns.
2. Design token file and component usage guide.
3. Prioritized implementation backlog with estimates.
4. A/B or staged rollout strategy for major interaction changes.

## Immediate Backlog (Start Next)
1. Create design tokens for depth, blur, and elevation.
2. Implement dashboard bento variant behind feature flag.
3. Add global hotkey overlay spike.
4. Build permission story prototype.
5. Add reduced-motion support and motion presets.

## Open Questions
1. Should Typerr default to compact overlay mode or full dashboard mode after summon?
2. What level of tray animation is acceptable before it feels distracting?
3. Should Smart Audit auto-run after each session or remain user-triggered?
4. Which onboarding artifact works better: short video loop or static storyboard?

## Decision Rule
Adopt changes only when both conditions are true:
1. Measurable improvement in comprehension, activation, or retention proxy.
2. No regression in responsiveness or desktop non-intrusive behavior.
