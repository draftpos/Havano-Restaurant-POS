import { Slot } from "@radix-ui/react-slot"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils"

function Button({
  className,
  variant,
  size,
  block = false,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    />
  );
}

export { Button };
