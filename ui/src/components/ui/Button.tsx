import * as React from "react"
import { motion, HTMLMotionProps } from "motion/react"
import { cn } from "@/src/lib/utils"

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group",
          {
            "bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]": variant === "default",
            "border border-white/10 bg-white/5 text-white hover:bg-white/10": variant === "outline",
            "text-zinc-400 hover:text-white hover:bg-white/5": variant === "ghost",
            "bg-zinc-900 text-white hover:bg-zinc-800 border border-white/5": variant === "secondary",
            "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20": variant === "destructive",
            "h-10 px-5 py-2": size === "default",
            "h-8 px-4 text-xs": size === "sm",
            "h-12 px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      >
        {variant === "default" && (
          <span className="absolute inset-0 w-full h-full animate-shimmer pointer-events-none" />
        )}
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </motion.button>
    )
  }
)
Button.displayName = "Button"
export { Button }
