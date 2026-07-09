# UI Contract: User Login Form

## Visible Elements

- Page-level login experience with title and supporting copy.
- Email field with label, placeholder, autocomplete hint, and error region.
- Password field with label, placeholder, autocomplete hint, and error region.
- Remember-me checkbox.
- Forgot-password link that does not start a real recovery flow.
- Submit button with default and submitting states.
- Success feedback after a valid simulated submit.

## Interaction Contract

- Empty submit shows required errors for email and password.
- Invalid email shows an email-specific error.
- Password shorter than 8 characters shows a password-specific error.
- Valid submit disables duplicate submission and shows loading feedback.
- Simulated success appears after the local delay.
- Editing a field after success clears success feedback.

## Accessibility Contract

- Every input has an accessible label.
- Validation errors are associated with the relevant field.
- Submit progress and success feedback are exposed through status text.
- Keyboard users can tab through all controls in a predictable order.
