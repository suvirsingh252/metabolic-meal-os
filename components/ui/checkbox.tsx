import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, type: _type, ...props }, ref) => (
    <input
      className={cn(
        "h-5 w-5 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-4 sm:w-4",
        className
      )}
      ref={ref}
      type="checkbox"
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
