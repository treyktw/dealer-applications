// src/components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex w-full rounded-md border shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Light-on-light for light mode, dark-on-dark for dark mode
        "bg-white dark:bg-background",
        // Default padding and height
        "px-4 py-3 min-h-[48px] text-base",
        // Focus states
        "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[2px]",
        // Error states
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }