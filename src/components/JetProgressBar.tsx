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
      <div className="h-4 bg-white rounded-full overflow-visible border border-blue-200/40 relative">
        {/* Progress Fill with Contrail effect */}
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 relative overflow-visible"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Contrail - dark blue hazy overlay fading from jet (right) to left */}
          <div className="absolute inset-0">
            {/* Main contrail overlay - most opaque near jet, fading left */}
            <div className="absolute inset-0 bg-gradient-to-l from-blue-400/50 via-blue-300/40 to-transparent blur-sm"></div>
            {/* Secondary contrail layer for depth */}
            <div className="absolute inset-0 bg-gradient-to-l from-blue-300/40 via-blue-200/30 to-transparent blur-[2px]"></div>
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
          <div className="relative" style={{ transform: 'rotate(45deg)' }}>
            {/* Jet shadow/glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-900/10 rounded-full blur-sm"></div>
            {/* Jet icon - rotated to face right */}
            <Plane 
              className="w-5 h-5 text-blue-600 relative z-10 drop-shadow-sm" 
              fill="currentColor"
            />
          </div>
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

