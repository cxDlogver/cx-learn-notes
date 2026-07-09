# Tasks: User Login Form

**Input**: Design documents from `specs/001-user-login-form/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Include behavior tests because the feature changes user-visible validation and submission flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Project initialization and shared toolchain

- [x] T001 Create React/Vite project manifest and TypeScript configs in `package.json`, `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json`
- [x] T002 Configure Vite, TailwindCSS 4, and test setup in `vite.config.ts` and `src/test/setup.ts`
- [x] T003 Configure ESLint, Prettier, cspell, and ignore rules in `eslint.config.js`, `prettier.config.js`, `cspell.json`, `.prettierignore`, and `.gitignore`
- [x] T004 Create app entry files in `index.html`, `src/main.tsx`, `src/App.tsx`, and `src/styles/index.css`

---

## Phase 2: Foundational

**Purpose**: Shared login form structure and validation helpers

- [x] T005 Create `src/components/LoginForm.tsx` with typed local state, validation function, and accessible form skeleton

**Checkpoint**: Foundation ready; user stories can be implemented.

---

## Phase 3: User Story 1 - Submit valid login details (Priority: P1) MVP

**Goal**: User submits valid email/password and sees simulated loading then success.

**Independent Test**: Enter `user@example.com` and `password123`, submit, and verify loading and success feedback.

### Tests for User Story 1

- [x] T006 [P] [US1] Add valid submit behavior test in `tests/LoginForm.test.tsx`

### Implementation for User Story 1

- [x] T007 [US1] Implement simulated submit, duplicate-submit prevention, and success feedback in `src/components/LoginForm.tsx`
- [x] T008 [US1] Render the login form from `src/App.tsx`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Correct invalid login input (Priority: P2)

**Goal**: User sees actionable field-specific validation errors.

**Independent Test**: Submit empty fields, invalid email, and short password; verify errors.

### Tests for User Story 2

- [x] T009 [P] [US2] Add validation error tests in `tests/LoginForm.test.tsx`

### Implementation for User Story 2

- [x] T010 [US2] Implement email/password validation errors and field recovery behavior in `src/components/LoginForm.tsx`

**Checkpoint**: User Stories 1 and 2 work independently.

---

## Phase 5: User Story 3 - Use secondary form options (Priority: P3)

**Goal**: User can toggle remember me and access the forgot-password affordance.

**Independent Test**: Toggle remember me and verify forgot-password link is visible.

### Tests for User Story 3

- [x] T011 [P] [US3] Add remember-me and forgot-password tests in `tests/LoginForm.test.tsx`

### Implementation for User Story 3

- [x] T012 [US3] Implement remember-me checkbox, forgot-password link, and responsive UI polish in `src/components/LoginForm.tsx`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Validation

**Purpose**: Cross-cutting quality checks and final review

- [x] T013 Run `pnpm install` to create the dependency lockfile
- [ ] T014 Run and fix `pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm spellcheck`, and `pnpm test`
- [ ] T015 Review implementation against `specs/001-user-login-form/spec.md`, `plan.md`, and `contracts/ui-contract.md`

---

## Dependencies & Execution Order

- Phase 1 must complete before Phase 2.
- Phase 2 must complete before user story work.
- User Story 1 is the MVP and should complete before User Stories 2 and 3.
- User Stories 2 and 3 can be tested independently after the foundational form exists.
- Polish and validation depend on all selected user stories.

## Parallel Opportunities

- T006, T009, and T011 are independent test additions once the test file exists.
- Tool configuration files in T003 can be reviewed independently from component implementation.

## Implementation Strategy

1. Complete setup and foundational form.
2. Implement MVP submit behavior and validate it.
3. Add validation behavior.
4. Add secondary options and responsive polish.
5. Install dependencies and run all quality gates.
