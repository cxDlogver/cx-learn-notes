# Data Model: User Login Form

## LoginFormState

- `email`: User-entered email string.
- `password`: User-entered password string.
- `rememberMe`: Boolean selected state for the remember-me option.
- `errors`: Field-specific validation messages for email and password.
- `status`: One of `idle`, `submitting`, or `success`.

## LoginAttempt

- `email`: Validated email used for the simulated attempt.
- `rememberMe`: Selected remember-me value at submit time.
- `startedAt`: Moment the simulated submit begins.
- `result`: Local simulated result, currently success only after validation.

## Validation Rules

- Email is required and must resemble a valid email address.
- Password is required and must be at least 8 characters.
- Submit is blocked while `status` is `submitting`.
- Field changes after success return the form to an editable non-success state.
