import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Pressable } from "react-native";
import { cn } from "../../lib/utils";
import { TextClassContext } from "./text";

const buttonVariants = cva(
  "group flex items-center justify-center rounded-md web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-offset-2 web:focus-visible:ring-ring web:ring-offset-background web:transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-90 web:hover:opacity-90",
        destructive: "bg-destructive active:opacity-90 web:hover:opacity-90",
        outline:
          "border border-input bg-background active:bg-accent web:hover:bg-accent web:hover:text-accent-foreground",
        secondary: "bg-secondary active:opacity-80 web:hover:opacity-80",
        ghost:
          "active:bg-accent web:hover:bg-accent web:hover:text-accent-foreground",
        link: "text-primary web:focus:underline web:hover:underline web:underline-offset-4",
      },
      size: {
        default: "h-10 px-4 py-2 native:h-12 native:px-5 native:py-3",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 native:h-14",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva(
  "font-medium text-sm text-foreground web:whitespace-nowrap web:transition-colors native:text-base",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "group-active:text-accent-foreground",
        secondary:
          "text-secondary-foreground group-active:text-secondary-foreground",
        ghost: "group-active:text-accent-foreground",
        link: "text-primary group-active:underline",
      },
      size: {
        default: "",
        sm: "",
        lg: "native:text-lg",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => {
  return (
    <TextClassContext.Provider
      value={buttonTextVariants({
        variant,
        size,
        className: "web:pointer-events-none",
      })}
    >
      <Pressable
        className={cn(
          props.disabled && "web:pointer-events-none opacity-50",
          buttonVariants({ variant, size, className })
        )}
        ref={ref}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
});
Button.displayName = "Button";

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
