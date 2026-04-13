import * as React from "react"
import { cn } from "@/src/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div ref={ref} className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)} {...props}>
      <div
        className="h-full w-full flex-1 bg-white transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"
export { Progress }
