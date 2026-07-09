import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, className, id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="dui-field" htmlFor={inputId}>
      {label ? <span className="dui-field__label">{label}</span> : null}
      <input
        ref={ref}
        id={inputId}
        className={cx("dui-input", error ? "dui-input--error" : false, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span className="dui-field__message dui-field__message--error" id={errorId}>
          {error}
        </span>
      ) : helperText ? (
        <span className="dui-field__message" id={helperId}>
          {helperText}
        </span>
      ) : null}
    </label>
  );
});
