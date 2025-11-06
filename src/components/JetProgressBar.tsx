import { motion } from "framer-motion"
import { Plane } from "lucide-react"

interface JetProgressBarProps {
  step: number
  totalSteps: number
}

export default function JetProgressBar({ step, totalSteps }: JetProgressBarProps) {
  const progress = (step / totalSteps) * 100

  return (
    <div className="relative">
      {/* Sky/Background Track */}
      <div className="h-4 bg-gradient-to-b from-sky-50 via-blue-50/50 to-sky-50 rounded-full overflow-visible border border-blue-200/30 relative">
        {/* Progress Fill with Contrail effect */}
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 relative overflow-visible"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Contrail - white hazy overlay on the blue fill */}
          <div className="absolute inset-0">
            {/* Main contrail overlay - hazy white on blue */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/30 to-white/20 blur-sm"></div>
            {/* Secondary contrail layer for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/15 to-transparent blur-[2px]"></div>
          </div>
        </motion.div>
        
        {/* Jet Icon - positioned directly on the progress bar at the leading edge */}
        <motion.div
          className="absolute top-1/2 z-20"
          style={{ 
            left: `${Math.max(0, Math.min(progress, 100))}%`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ left: "0%" }}
          animate={{ left: `${Math.max(0, Math.min(progress, 100))}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <Plane 
            className="w-5 h-5 text-blue-700 drop-shadow-md" 
            fill="currentColor"
          />
        </motion.div>
      </div>
      
      {/* Step info */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-zinc-600">Step {step} of {totalSteps}</span>
        <span className="text-xs text-zinc-600">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

