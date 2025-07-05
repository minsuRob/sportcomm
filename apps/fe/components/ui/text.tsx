import * as Slot from "@rn-primitives/slot";
import * as React from "react";
import { Text as RNText } from "react-native";
import { cn } from "../../lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

const Text = React.forwardRef<
  React.ElementRef<typeof RNText>,
  React.ComponentPropsWithoutRef<typeof RNText> & {
    asChild?: boolean;
  }
>(({ className, asChild = false, ...props }, ref) => {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return (
    <Component
      ref={ref}
      className={cn(
        "text-base text-foreground web:select-text",
        textClass,
        className
      )}
      {...props}
    />
  );
});
Text.displayName = "Text";

export { Text, TextClassContext };
