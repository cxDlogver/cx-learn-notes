# Research: User Login Form

## Decision: Use React 19 + Vite root app

**Rationale**: The project is currently empty except for Spec Kit and skills. A root Vite app is the smallest structure that satisfies the requested frontend feature.

**Alternatives considered**: Nested `frontend/` directory was rejected because there is no backend or monorepo structure.

## Decision: Use TailwindCSS 4 with `@tailwindcss/vite`

**Rationale**: TailwindCSS 4 uses a Vite plugin integration. This avoids obsolete Tailwind 3 PostCSS boilerplate.

**Alternatives considered**: PostCSS-only setup was rejected because the current Tailwind package has first-class Vite support.

## Decision: Simulate login locally in the component

**Rationale**: The spec explicitly excludes real backend calls. A local timeout models loading and success states while keeping credentials local.

**Alternatives considered**: Mock service module was rejected as unnecessary for a single form and no shared API boundary.

## Decision: Use Vitest and Testing Library

**Rationale**: This aligns with Vite frontend testing and verifies user-visible behavior without browser automation overhead.

**Alternatives considered**: E2E tooling was rejected for v1 because the flow is a single local form.
