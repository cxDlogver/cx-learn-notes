import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-pill border border-transparent bg-input px-4 py-2 text-sm text-foreground shadow-[rgb(124,124,124)_0px_0px_0px_1px_inset] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:shadow-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
