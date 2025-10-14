import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, MapPin, Calendar, Users, Plane } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TripType = "one-way" | "round-trip" | null

export default function NoAirlinesBooking() {
  const [step, setStep] = useState(1)
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [passengers, setPassengers] = useState(1)
  const [tripType, setTripType] = useState<TripType>(null)

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  const handleSubmit = () => {
    console.log({
      from: fromLocation,
      to: toLocation,
      date,
      time,
      passengers,
      tripType
    })
    alert(`Quote requested for ${passengers} passenger(s) from ${fromLocation} to ${toLocation}`)
  }

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">NoAirlines</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="relative">
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(step / 5) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-zinc-500">Step {step} of 5</span>
                <span className="text-xs text-zinc-500">{Math.round((step / 5) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">

          <AnimatePresence mode="wait">
            {/* Step 1: From Location */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <MapPin className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Where are you flying from?
                  </h1>
                </div>
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="Enter departure city or airport code"
                    className="h-14 text-lg bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    autoFocus
                  />
                  <Button
                    onClick={nextStep}
                    disabled={!fromLocation.trim()}
                    className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: To Location */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <MapPin className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Where are you flying to?
                  </h1>
                </div>
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="Enter destination city or airport code"
                    className="h-14 text-lg bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-white text-white hover:bg-white hover:text-black min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!toLocation.trim()}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Time */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <Calendar className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">When?</h1>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Date</label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-14 text-lg bg-zinc-900 border-zinc-800 text-white"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Time</label>
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-14 text-lg bg-zinc-900 border-zinc-800 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-white text-white hover:bg-white hover:text-black min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!date || !time}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Passengers */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <Users className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    How many passengers?
                  </h1>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-6">
                    <Button
                      onClick={() => setPassengers(Math.max(1, passengers - 1))}
                      variant="outline"
                      className="h-16 w-16 text-2xl border-zinc-700 hover:bg-zinc-900"
                    >
                      −
                    </Button>
                    <div className="text-6xl font-semibold w-24 text-center">{passengers}</div>
                    <Button
                      onClick={() => setPassengers(Math.min(20, passengers + 1))}
                      variant="outline"
                      className="h-16 w-16 text-2xl border-zinc-700 hover:bg-zinc-900"
                    >
                      +
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-white text-white hover:bg-white hover:text-black min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-1 h-14 text-lg bg-red-600 hover:bg-red-500"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Trip Type */}
            {step === 5 && (
              <motion.div
                key="step5"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <Plane className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    One-way or Round Trip?
                  </h1>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setTripType("one-way")}
                      className={`h-32 rounded-xl border-2 transition-all ${
                        tripType === "one-way"
                          ? "border-blue-600 bg-blue-600/10"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="text-2xl font-semibold">One-way</div>
                      <div className="text-sm text-zinc-400 mt-2">Single flight</div>
                    </button>
                    <button
                      onClick={() => setTripType("round-trip")}
                      className={`h-32 rounded-xl border-2 transition-all ${
                        tripType === "round-trip"
                          ? "border-blue-600 bg-blue-600/10"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="text-2xl font-semibold">Round Trip</div>
                      <div className="text-sm text-zinc-400 mt-2">Return flight included</div>
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-white text-white hover:bg-white hover:text-black min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!tripType}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Get Quotes
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer with Legal Text */}
      <footer className="border-t border-zinc-900 bg-black">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-xs text-zinc-500">
          <p>
            NoAirlines.com acts as an air charter broker and is not a direct air carrier. All
            flights are operated by FAA-certificated Part 135 air carriers who exercise full
            operational control of charter flights at all times.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} NoAirlines. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
