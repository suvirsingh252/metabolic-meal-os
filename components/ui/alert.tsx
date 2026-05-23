import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive",
      className
    )}
    ref={ref}
    role="alert"
    {...props}
  />
));
Alert.displayName = "Alert";

export { Alert };
