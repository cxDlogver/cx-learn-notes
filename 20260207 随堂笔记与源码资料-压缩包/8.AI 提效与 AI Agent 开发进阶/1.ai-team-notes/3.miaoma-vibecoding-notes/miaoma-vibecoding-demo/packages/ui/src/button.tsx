import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className,
    children,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("dui-button", `dui-button--${variant}`, `dui-button--${size}`, className)}
      disabled={disabled || loading}
      data-loading={loading ? "true" : undefined}
      {...rest}
    >
      {loading ? <span className="dui-button__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
});
