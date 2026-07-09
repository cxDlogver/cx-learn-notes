import { FormEvent, useMemo, useState } from 'react';

type LoginStatus = 'idle' | 'submitting' | 'success';
type LoginField = 'email' | 'password';
type LoginErrors = Partial<Record<LoginField, string>>;

type LoginFormState = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm(form: LoginFormState): LoginErrors {
  const nextErrors: LoginErrors = {};

  if (!form.email.trim()) {
    nextErrors.email = 'Email is required.';
  } else if (!emailPattern.test(form.email)) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (!form.password) {
    nextErrors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    nextErrors.password = 'Password must be at least 8 characters.';
  }

  return nextErrors;
}

function hasErrors(errors: LoginErrors) {
  return Object.keys(errors).length > 0;
}

export function LoginForm() {
  const [form, setForm] = useState<LoginFormState>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [status, setStatus] = useState<LoginStatus>('idle');

  const isSubmitting = status === 'submitting';
  const statusMessage = useMemo(() => {
    if (status === 'submitting') {
      return 'Signing in...';
    }

    if (status === 'success') {
      return `Signed in successfully as ${form.email}.`;
    }

    return '';
  }, [form.email, status]);

  function updateField(field: LoginField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });

    if (status === 'success') {
      setStatus('idle');
    }
  }

  function updateRememberMe(value: boolean) {
    setForm((current) => ({ ...current, rememberMe: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateLoginForm(form);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setStatus('idle');
      return;
    }

    setStatus('submitting');
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setStatus('success');
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-4 py-8 text-[#18212f] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden lg:block">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#2f6f63]">
              Secure access
            </p>
            <h1 className="max-w-md text-4xl font-semibold leading-tight text-[#18212f]">
              Sign in to continue your workspace session.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#5d6673]">
              A focused login surface with local validation, clear status feedback, and no backend
              calls.
            </p>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-md rounded-lg border border-[#d7ded6] bg-white p-6 shadow-[0_24px_80px_rgba(29,43,38,0.12)] sm:p-8"
          >
            <div className="mb-8">
              <p className="text-sm font-semibold text-[#2f6f63]">Account login</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#18212f]">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-[#69717e]">
                Enter your credentials to simulate a secure sign-in flow.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#293341]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={form.email}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="user@example.com"
                  className="mt-2 block w-full rounded-md border border-[#cbd4ce] bg-white px-3 py-3 text-sm text-[#18212f] outline-none transition focus:border-[#2f6f63] focus:ring-3 focus:ring-[#2f6f63]/20 disabled:cursor-not-allowed disabled:bg-[#f1f3f0]"
                />
                {errors.email ? (
                  <p id="email-error" className="mt-2 text-sm text-[#b42318]">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#293341]">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-2 block w-full rounded-md border border-[#cbd4ce] bg-white px-3 py-3 text-sm text-[#18212f] outline-none transition focus:border-[#2f6f63] focus:ring-3 focus:ring-[#2f6f63]/20 disabled:cursor-not-allowed disabled:bg-[#f1f3f0]"
                />
                {errors.password ? (
                  <p id="password-error" className="mt-2 text-sm text-[#b42318]">
                    {errors.password}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-[#3d4654]">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  disabled={isSubmitting}
                  onChange={(event) => updateRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-[#aeb9b2] text-[#2f6f63] focus:ring-[#2f6f63]"
                />
                Remember me
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => event.preventDefault()}
                className="font-medium text-[#235e83] underline-offset-4 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 flex h-12 w-full items-center justify-center rounded-md bg-[#2f6f63] px-4 text-sm font-semibold text-white transition hover:bg-[#25594f] focus:outline-none focus:ring-3 focus:ring-[#2f6f63]/30 disabled:cursor-not-allowed disabled:bg-[#8aa89f]"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div aria-live="polite" role="status" className="mt-4 min-h-6 text-sm">
              {statusMessage ? (
                <p className={status === 'success' ? 'text-[#1f6f3a]' : 'text-[#5d6673]'}>
                  {statusMessage}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
