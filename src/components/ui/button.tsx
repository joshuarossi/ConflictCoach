import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-label font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-on shadow-1 hover:bg-accent-hover",
        destructive:
          // NOTE: text-accent-on is reused here (and on bg-warning, bg-coach-accent)
          // as a generic "contrasting text on filled background" token. Current light/dark
          // values produce correct WCAG contrast. If accent-on diverges from danger/warning
          // needs, add dedicated --danger-on / --warning-on tokens.
          "bg-danger text-accent-on shadow-1 hover:bg-danger/90",
        outline:
          "border border-border-default bg-surface shadow-1 hover:bg-surface-subtle hover:text-text-primary",
        secondary:
          "bg-surface-subtle text-text-primary shadow-1 hover:bg-surface-subtle/80",
        ghost: "hover:bg-surface-subtle hover:text-text-primary",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-meta",
        lg: "h-12 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
