import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LoginForm } from '../src/components/LoginForm';

describe('LoginForm', () => {
  it('shows loading and success feedback for valid credentials', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    await waitFor(
      () => {
        expect(screen.getByText(/signed in successfully as user@example.com/i)).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it('shows required errors for an empty submit', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows format and length errors for invalid input', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('supports remember me and shows a forgot password affordance', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    const rememberMe = screen.getByRole('checkbox', { name: /remember me/i });
    expect(rememberMe).not.toBeChecked();

    await user.click(rememberMe);

    expect(rememberMe).toBeChecked();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });
});
