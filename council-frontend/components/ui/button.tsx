import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(232,115,74,0.3)] rounded",
        outline:
          "border border-border-dark hover:bg-card-dark text-white rounded-lg",
        ghost:
          "text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg",
        secondary:
          "bg-white/5 hover:bg-white/10 text-white rounded-lg",
        destructive:
          "bg-red-500 hover:bg-red-600 text-white rounded",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-6",
        lg: "h-14 px-10 text-lg rounded-lg",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
