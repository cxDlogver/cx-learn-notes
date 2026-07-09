# Quickstart: User Login Form

## Prerequisites

- Node.js compatible with Vite 8.
- pnpm available in the shell.

## Setup

```bash
pnpm install
```

## Run Locally

```bash
pnpm dev
```

Open the Vite local URL and verify the login form is visible.

## Validate

```bash
pnpm build
pnpm lint
pnpm format:check
pnpm spellcheck
pnpm test
```

## Manual Scenarios

- Submit with empty fields and confirm email/password errors.
- Enter an invalid email and confirm the email error.
- Enter a short password and confirm the password error.
- Enter `user@example.com` and `password123`, submit, confirm loading then success.
- Toggle remember me and confirm the visual checked state changes.
