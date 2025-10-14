import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, MapPin, Calendar, Users, Plane, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TripType = "one-way" | "round-trip" | null

interface Airport {
  codeIata: string
  codeIcao: string
  name: string
  city: string
  country: string
}

const AVIATION_EDGE_API_KEY = "ebf7a6-412b1a"

export default function NoAirlinesBooking() {
  const [step, setStep] = useState(1)
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [passengers, setPassengers] = useState(1)
  const [tripType, setTripType] = useState<TripType>(null)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [returnTime, setReturnTime] = useState("")
  const [fromSuggestions, setFromSuggestions] = useState<Airport[]>([])
  const [toSuggestions, setToSuggestions] = useState<Airport[]>([])
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  const nextStep = () => {
    // If selecting round-trip on step 5, go to return flight step (step 6)
    if (step === 5 && tripType === "round-trip") {
      setStep(6) // Go to return flight step
    } else {
      setStep(step + 1)
    }
  }
  
  const prevStep = () => {
    // If on email step and round-trip, go back to return flight step
    if (step === 7 && tripType === "round-trip") {
      setStep(6) // Go back to return flight step
    } else if (step === 6 && tripType === "round-trip") {
      setStep(5) // Go back to trip type selection
    } else {
      setStep(step - 1)
    }
  }

  const handleSubmit = () => {
    console.log({
      from: fromLocation,
      to: toLocation,
      date,
      time,
      passengers,
      tripType,
      email,
      name
    })
    setStep(10) // Go to success screen
  }

  // Airport search function
  const searchAirports = async (query: string): Promise<Airport[]> => {
    if (query.length < 2) return []
    
    try {
      const response = await fetch(
        `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&city=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      return data || []
    } catch (error) {
      console.error('Error fetching airports:', error)
      return []
    }
  }

  // Handle from location input
  const handleFromLocationChange = async (value: string) => {
    setFromLocation(value)
    if (value.length >= 2) {
      const airports = await searchAirports(value)
      setFromSuggestions(airports.slice(0, 5)) // Limit to 5 suggestions
      setShowFromSuggestions(true)
    } else {
      setFromSuggestions([])
      setShowFromSuggestions(false)
    }
  }

  // Handle to location input
  const handleToLocationChange = async (value: string) => {
    setToLocation(value)
    if (value.length >= 2) {
      const airports = await searchAirports(value)
      setToSuggestions(airports.slice(0, 5)) // Limit to 5 suggestions
      setShowToSuggestions(true)
    } else {
      setToSuggestions([])
      setShowToSuggestions(false)
    }
  }

  // Select airport from suggestions
  const selectFromAirport = (airport: Airport) => {
    setFromLocation(`${airport.city} (${airport.codeIata})`)
    setFromSuggestions([])
    setShowFromSuggestions(false)
  }

  const selectToAirport = (airport: Airport) => {
    setToLocation(`${airport.city} (${airport.codeIata})`)
    setToSuggestions([])
    setShowToSuggestions(false)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromInputRef.current && !fromInputRef.current.contains(event.target as Node)) {
        setShowFromSuggestions(false)
      }
      if (toInputRef.current && !toInputRef.current.contains(event.target as Node)) {
        setShowToSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-300 bg-white/90 backdrop-blur sticky top-0 z-50">
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
              <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(step / 9) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-zinc-600">Step {step} of 9</span>
                <span className="text-xs text-zinc-600">{Math.round((step / 9) * 100)}%</span>
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
                  <div className="relative" ref={fromInputRef}>
                    <Input
                      type="text"
                      value={fromLocation}
                      onChange={(e) => handleFromLocationChange(e.target.value)}
                      placeholder="Enter departure city or airport code"
                      className="h-14 text-lg bg-white border-zinc-300 text-black placeholder:text-zinc-500"
                      autoFocus
                    />
                    {showFromSuggestions && fromSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg z-50">
                        {fromSuggestions.map((airport, index) => (
                          <button
                            key={index}
                            onClick={() => selectFromAirport(airport)}
                            className="w-full px-4 py-3 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0"
                          >
                            <div className="font-semibold text-black">
                              {airport.city} ({airport.codeIata})
                            </div>
                            <div className="text-sm text-zinc-600">
                              {airport.name} • {airport.country}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                  <div className="relative" ref={toInputRef}>
                    <Input
                      type="text"
                      value={toLocation}
                      onChange={(e) => handleToLocationChange(e.target.value)}
                      placeholder="Enter destination city or airport code"
                      className="h-14 text-lg bg-white border-zinc-300 text-black placeholder:text-zinc-500"
                      autoFocus
                    />
                    {showToSuggestions && toSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg z-50">
                        {toSuggestions.map((airport, index) => (
                          <button
                            key={index}
                            onClick={() => selectToAirport(airport)}
                            className="w-full px-4 py-3 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0"
                          >
                            <div className="font-semibold text-black">
                              {airport.city} ({airport.codeIata})
                            </div>
                            <div className="text-sm text-zinc-600">
                              {airport.name} • {airport.country}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
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
                        className="h-14 text-lg bg-white border-zinc-300 text-black"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Time</label>
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-14 text-lg bg-white border-zinc-300 text-black"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
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
                      className="h-16 w-16 text-2xl border-zinc-300 hover:bg-zinc-100"
                    >
                      −
                    </Button>
                    <div className="text-6xl font-semibold w-24 text-center">{passengers}</div>
                    <Button
                      onClick={() => setPassengers(Math.min(20, passengers + 1))}
                      variant="outline"
                      className="h-16 w-16 text-2xl border-zinc-300 hover:bg-zinc-100"
                    >
                      +
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500"
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
                          : "border-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      <div className="text-2xl font-semibold">One-way</div>
                      <div className="text-sm text-zinc-600 mt-2">Single flight</div>
                    </button>
                    <button
                      onClick={() => setTripType("round-trip")}
                      className={`h-32 rounded-xl border-2 transition-all ${
                        tripType === "round-trip"
                          ? "border-blue-600 bg-blue-600/10"
                          : "border-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      <div className="text-2xl font-semibold">Round Trip</div>
                      <div className="text-sm text-zinc-600 mt-2">Return flight included</div>
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!tripType}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Return Flight (Round Trip Only) */}
            {step === 6 && tripType === "round-trip" && (
              <motion.div
                key="step6-return"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <Calendar className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    When would you like to return?
                  </h1>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-600">Return Date</label>
                      <Input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="h-14 text-lg bg-white border-zinc-300 text-black"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-600">Return Time</label>
                      <Input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="h-14 text-lg bg-white border-zinc-300 text-black"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!returnDate || !returnTime}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 7: Email */}
            {step === 7 && (
              <motion.div
                key="step6"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <Mail className="h-16 w-16 mx-auto text-blue-600" />
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    What's your email address?
                  </h1>
                </div>
                <div className="space-y-4">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-14 text-lg bg-white border-zinc-300 text-black placeholder:text-zinc-500"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!email.trim()}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 8: Name */}
            {step === 8 && (
              <motion.div
                key="step7"
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
                    What's your name?
                  </h1>
                </div>
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-14 text-lg bg-white border-zinc-300 text-black placeholder:text-zinc-500"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!name.trim()}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 9: Summary */}
            {step === 9 && (
              <motion.div
                key="step8"
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
                    Review Your Itinerary
                  </h1>
                </div>
                
                <div className="bg-zinc-50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-zinc-600">From</div>
                      <div className="text-lg font-semibold">{fromLocation}</div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-600">To</div>
                      <div className="text-lg font-semibold">{toLocation}</div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-600">Departure</div>
                      <div className="text-lg font-semibold">{date} at {time}</div>
                    </div>
                    {tripType === "round-trip" && (
                      <div>
                        <div className="text-sm text-zinc-600">Return</div>
                        <div className="text-lg font-semibold">{returnDate} at {returnTime}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-zinc-600">Passengers</div>
                      <div className="text-lg font-semibold">{passengers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-600">Trip Type</div>
                      <div className="text-lg font-semibold capitalize">{tripType?.replace('-', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-600">Contact</div>
                      <div className="text-lg font-semibold">{name}</div>
                      <div className="text-sm text-zinc-600">{email}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={prevStep}
                    className="h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white min-w-[120px] transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500"
                  >
                    Get Quote
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Success Screen */}
            {step === 10 && (
              <motion.div
                key="step9"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8 text-center"
              >
                <div className="space-y-4">
                  <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Thank you!
                  </h1>
                  <p className="text-lg text-zinc-600 max-w-md mx-auto">
                    We have received your itinerary. You will receive a quote to your inbox within 1 hour.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer with Legal Text */}
      <footer className="border-t border-zinc-300 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-xs text-zinc-600">
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
