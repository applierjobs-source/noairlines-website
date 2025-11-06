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
      <div className="h-4 bg-gradient-to-b from-sky-100 via-blue-50 to-sky-100 rounded-full overflow-visible border border-blue-200/50 shadow-inner">
        {/* Progress Fill (Contrail base) */}
        <motion.div
          className="h-full bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 relative overflow-visible"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Contrails - multiple layers for realistic effect */}
          <div className="absolute inset-0 overflow-visible">
            {/* Main contrail - thick white trail */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-gradient-to-r from-white/60 via-white/40 to-transparent blur-sm"></div>
            {/* Secondary contrail - thinner, more diffused */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-white/40 via-white/20 to-transparent blur-[3px]"></div>
            {/* Fading trail at the end */}
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-8 h-2 bg-gradient-to-l from-white/30 to-transparent blur-md"></div>
          </div>
        </motion.div>
        
        {/* Jet Icon - positioned at the end of progress */}
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
          <div className="relative">
            {/* Jet shadow/glow */}
            <div className="absolute top-1 left-0.5 w-5 h-5 bg-blue-900/15 rounded-full blur-md"></div>
            {/* Jet icon - angled upward like ascending */}
            <Plane 
              className="w-6 h-6 text-blue-700 relative z-10 drop-shadow-sm" 
              style={{ transform: 'rotate(-45deg)' }}
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

