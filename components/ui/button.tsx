import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-sans font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        md: "h-10 px-5 text-sm",
        sm: "h-8 px-3 text-xs",
      },
      variant: {
        primary:
          "bg-luna-cyan text-luna-base border border-luna-cyan hover:bg-luna-cyan-dim hover:border-luna-cyan-dim",
        outline:
          "border border-luna-hairline text-luna-fg-3 hover:text-luna-fg hover:border-luna-hairline-2",
        ghost:
          "text-luna-fg-3 hover:bg-luna-base-3 hover:text-luna-fg",
        icon:
          "h-8 w-8 p-0 text-luna-fg-3 hover:bg-luna-base-3 hover:text-luna-fg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
