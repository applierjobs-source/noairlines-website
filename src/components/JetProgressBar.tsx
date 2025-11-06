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
      {/* Jet Icon - positioned above the progress bar */}
      <motion.div
        className="absolute -top-3 z-20"
        style={{ 
          left: `${Math.max(0, Math.min(progress, 100))}%`,
          transform: 'translateX(-50%)'
        }}
        initial={{ left: "0%" }}
        animate={{ left: `${Math.max(0, Math.min(progress, 100))}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div className="relative">
          {/* Jet icon - facing right */}
          <Plane 
            className="w-6 h-6 text-blue-700 relative z-10 drop-shadow-sm" 
            fill="currentColor"
          />
        </div>
      </motion.div>

      {/* Sky/Background Track */}
      <div className="h-4 bg-gradient-to-b from-sky-100 via-blue-50 to-sky-100 rounded-full overflow-visible border border-blue-200/50 shadow-inner relative">
        {/* Progress Fill (Contrail base) */}
        <motion.div
          className="h-full bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 relative overflow-visible"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Contrails - multiple layers for realistic effect, positioned behind jet */}
          <div className="absolute inset-0 overflow-visible">
            {/* Main contrail - thick white trail */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-gradient-to-r from-white/60 via-white/40 to-transparent blur-sm"></div>
            {/* Secondary contrail - thinner, more diffused */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-white/40 via-white/20 to-transparent blur-[3px]"></div>
            {/* Fading trail at the end (where jet is) */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-l from-white/40 to-transparent blur-md"
              style={{ 
                right: 0,
                width: '20px'
              }}
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

