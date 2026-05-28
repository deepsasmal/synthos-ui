import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-accent text-accent-fg hover:bg-accent/90": variant === "primary",
            "bg-surface text-[color:var(--text-color)] hover:bg-surface-hover border border-border": variant === "secondary",
            "border border-border bg-transparent hover:bg-surface": variant === "outline",
            "hover:bg-surface text-muted hover:text-[color:var(--text-color)]": variant === "ghost",
            "h-9 px-4 py-2 text-sm": size === "md",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8 text-base": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
