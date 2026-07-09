import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

type CheckboxProps = {
  checked: boolean;
  label: string;
  onCheckedChange: () => void;
};

export function Checkbox({ checked, label, onCheckedChange }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked && "border-primary bg-primary text-primary-foreground",
      )}
      onClick={onCheckedChange}
    >
      {checked ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
    </button>
  );
}
