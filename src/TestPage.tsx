import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, MapPin, Calendar, Users, Plane, Mail, Search, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TripType = "one-way" | "round-trip" | null

interface Airport {
  codeIata?: string
  codeIcao?: string
  name?: string
  city?: string
  country?: string
  nameIata?: string
  nameAirport?: string
  nameCountry?: string
  codeIataAirport?: string
  codeIcaoAirport?: string
  codeIso2Country?: string
}

interface CharterQuote {
  id: string
  aircraft: string
  price: number
  currency: string
  departure_time: string
  arrival_time: string
  flight_time: string
  company: string
}

const AVIATION_EDGE_API_KEY = "ebf7a6-412b1a"
const AVIAPAGES_API_KEY = "eAl0nA2bGuAIPYLuQqW0hJTgGrOfTkjaTN2Q"

export default function TestPage() {
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
  const [quotes, setQuotes] = useState<CharterQuote[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [quotesError, setQuotesError] = useState("")
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  const nextStep = () => {
    if (step === 5 && tripType === "round-trip") {
      setStep(6)
    } else if (step === 5 && tripType === "one-way") {
      setStep(9) // Skip to email step for one-way
    } else {
      setStep(step + 1)
    }
  }
  
  const prevStep = () => {
    if (step === 9 && tripType === "round-trip") {
      setStep(8) // Go back to return time step
    } else if (step === 9 && tripType === "one-way") {
      setStep(5) // Go back to passengers step for one-way
    } else if (step === 8 && tripType === "round-trip") {
      setStep(7) // Go back to return date step
    } else if (step === 7 && tripType === "round-trip") {
      setStep(6) // Go back to return date step
    } else if (step === 6 && tripType === "round-trip") {
      setStep(5) // Go back to trip type selection
    } else {
      setStep(step - 1)
    }
  }

  // Airport search function using Aviation Edge API
  const searchAirports = async (query: string) => {
    if (query.length < 2) return []
    
    try {
      const response = await fetch(
        `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&query=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      return data || []
    } catch (error) {
      console.error('Error searching airports:', error)
      return []
    }
  }

  // AviaPages API integration for charter quotes
  const fetchCharterQuotes = async () => {
    console.log('Starting fetchCharterQuotes...')
    setLoadingQuotes(true)
    setQuotesError("")
    
    try {
      console.log('Searching airports for:', fromLocation, toLocation)
      // First, get airport codes for the locations
      const fromAirports = await searchAirports(fromLocation)
      const toAirports = await searchAirports(toLocation)
      
      console.log('Airport search results:', { fromAirports, toAirports })
      
      if (fromAirports.length === 0 || toAirports.length === 0) {
        throw new Error("Could not find airport codes for the specified locations")
      }
      
      const fromCode = fromAirports[0].codeIataAirport || fromAirports[0].codeIata
      const toCode = toAirports[0].codeIataAirport || toAirports[0].codeIata
      
      console.log('Airport codes:', { fromCode, toCode })
      
      if (!fromCode || !toCode) {
        throw new Error("Invalid airport codes")
      }
      
      // Format date for API (YYYY-MM-DD)
      const formattedDate = new Date(date).toISOString().split('T')[0]
      console.log('Formatted date:', formattedDate)
      
      // For now, let's skip the actual API call and just set some mock data
      console.log('Skipping AviaPages API call for now, using mock data')
      setQuotes([
        {
          id: '1',
          aircraft: 'Cessna Citation CJ3',
          price: 8500,
          currency: 'USD',
          departure_time: time,
          arrival_time: '14:30',
          flight_time: '2h 30m',
          company: 'Private Jet Charter Co.'
        },
        {
          id: '2',
          aircraft: 'Hawker 800XP',
          price: 12000,
          currency: 'USD',
          departure_time: time,
          arrival_time: '15:00',
          flight_time: '2h 45m',
          company: 'Elite Aviation'
        }
      ])
      
      // TODO: Uncomment this when ready to test real API
      /*
      // Call AviaPages Charter Quote API
      const response = await fetch('https://aviapages.com/api/v1/charter_quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AVIAPAGES_API_KEY}`,
        },
        body: JSON.stringify({
          departure_airport: fromCode,
          arrival_airport: toCode,
          departure_date: formattedDate,
          passengers: passengers,
          trip_type: tripType
        })
      })
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      setQuotes(data.quotes || [])
      */
      
    } catch (error) {
      console.error('Error fetching charter quotes:', error)
      setQuotesError(error instanceof Error ? error.message : 'Failed to fetch quotes')
    } finally {
      console.log('Setting loadingQuotes to false')
      setLoadingQuotes(false)
    }
  }

  const handleSubmit = async () => {
    console.log('Form submitted, current step:', step)
    
    const itineraryData = {
      from: fromLocation,
      to: toLocation,
      date,
      time,
      passengers,
      tripType,
      email,
      name,
      returnDate,
      returnTime
    }
    
    console.log('Submitting itinerary:', itineraryData)
    
    try {
      // Fetch quotes from AviaPages API
      console.log('Fetching quotes...')
      await fetchCharterQuotes()
      console.log('Quotes fetched, setting step to 11')
    } catch (error) {
      console.error('Error in fetchCharterQuotes:', error)
      // Continue anyway, show results page even if quotes fail
    }
    
    // Also send to your existing email system
    try {
      const response = await fetch('/api/submit-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itineraryData)
      })
      
      const result = await response.json()
      console.log('Email sent:', result.success)
    } catch (error) {
      console.error('Error sending email:', error)
    }
    
    console.log('Setting step to 11 for results')
    setStep(11) // Go to results screen
  }

  const handleFromInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFromLocation(value)
    
    if (value.length >= 2) {
      const suggestions = await searchAirports(value)
      setFromSuggestions(suggestions)
      setShowFromSuggestions(true)
    } else {
      setFromSuggestions([])
      setShowFromSuggestions(false)
    }
  }

  const handleToInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setToLocation(value)
    
    if (value.length >= 2) {
      const suggestions = await searchAirports(value)
      setToSuggestions(suggestions)
      setShowToSuggestions(true)
    } else {
      setToSuggestions([])
      setShowToSuggestions(false)
    }
  }

  const selectFromAirport = (airport: Airport) => {
    setFromLocation(airport.nameIata || airport.name || `${airport.city}, ${airport.country}`)
    setFromSuggestions([])
    setShowFromSuggestions(false)
  }

  const selectToAirport = (airport: Airport) => {
    setToLocation(airport.nameIata || airport.name || `${airport.city}, ${airport.country}`)
    setToSuggestions([])
    setShowToSuggestions(false)
  }

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            NoAirlines <span className="text-blue-600">Test</span>
          </h1>
          <p className="text-xl text-gray-600">Private Jet Charter with AviaPages API Integration</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
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
                  <div className="space-y-4 relative">
                    <Input
                      ref={fromInputRef}
                      type="text"
                      value={fromLocation}
                      onChange={handleFromInputChange}
                      placeholder="Enter departure city or airport"
                      className="h-14 text-lg bg-white border-zinc-300 text-black placeholder:text-zinc-500"
                      autoFocus
                    />
                    {showFromSuggestions && fromSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {fromSuggestions.map((airport, index) => (
                          <button
                            key={index}
                            onClick={() => selectFromAirport(airport)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">
                              {airport.nameIata || airport.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {airport.city}, {airport.country}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
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
                  <div className="space-y-4 relative">
                    <Input
                      ref={toInputRef}
                      type="text"
                      value={toLocation}
                      onChange={handleToInputChange}
                      placeholder="Enter destination city or airport"
                      className="h-14 text-lg bg-white border-zinc-300 text-black placeholder:text-zinc-500"
                      autoFocus
                    />
                    {showToSuggestions && toSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {toSuggestions.map((airport, index) => (
                          <button
                            key={index}
                            onClick={() => selectToAirport(airport)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">
                              {airport.nameIata || airport.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {airport.city}, {airport.country}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
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

              {/* Step 3: Date */}
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
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      When do you want to depart?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-14 text-lg bg-white border-zinc-300 text-black"
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
                        disabled={!date}
                        className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Time */}
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
                    <Calendar className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      What time would you like to depart?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="h-14 text-lg bg-white border-zinc-300 text-black"
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
                        disabled={!time}
                        className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Passengers */}
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
                    <Users className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      How many passengers?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-4">
                      <Button
                        onClick={() => setPassengers(Math.max(1, passengers - 1))}
                        className="h-12 w-12 rounded-full bg-gray-200 hover:bg-gray-300 text-black"
                      >
                        -
                      </Button>
                      <div className="text-4xl font-bold min-w-[60px] text-center">
                        {passengers}
                      </div>
                      <Button
                        onClick={() => setPassengers(passengers + 1)}
                        className="h-12 w-12 rounded-full bg-gray-200 hover:bg-gray-300 text-black"
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

              {/* Step 6: Trip Type */}
              {step === 6 && (
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
                    <Plane className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      What type of trip?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Button
                        onClick={() => {
                          setTripType("one-way")
                          nextStep()
                        }}
                        className="h-16 text-lg bg-white border-2 border-gray-300 text-black hover:bg-blue-50 hover:border-blue-500"
                      >
                        One Way
                      </Button>
                      <Button
                        onClick={() => {
                          setTripType("round-trip")
                          nextStep()
                        }}
                        className="h-16 text-lg bg-white border-2 border-gray-300 text-black hover:bg-blue-50 hover:border-blue-500"
                      >
                        Round Trip
                      </Button>
                    </div>
                    <Button
                      onClick={prevStep}
                      className="w-full h-14 text-lg bg-transparent border-2 border-black text-black hover:bg-black hover:text-white transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 7: Return Date (for round-trip) */}
              {step === 7 && tripType === "round-trip" && (
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
                    <Calendar className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      When do you want to return?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-14 text-lg bg-white border-zinc-300 text-black"
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
                        disabled={!returnDate}
                        className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 8: Return Time (for round-trip) */}
              {step === 8 && tripType === "round-trip" && (
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
                    <Calendar className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      What time for your return flight?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="h-14 text-lg bg-white border-zinc-300 text-black"
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
                        disabled={!returnTime}
                        className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 9: Email */}
              {step === 9 && (
                <motion.div
                  key="step9"
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

              {/* Step 10: Name */}
              {step === 10 && (
                <motion.div
                  key="step10"
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
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search className="mr-2 h-5 w-5" /> Get Quotes
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 11: Results */}
              {step === 11 && (
                <motion.div
                  key="step11"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <DollarSign className="h-16 w-16 mx-auto text-green-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      Charter Quotes
                    </h1>
                    <p className="text-lg text-gray-600">
                      {fromLocation} → {toLocation}
                    </p>
                  </div>
                  
                  {loadingQuotes && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Fetching quotes from AviaPages...</p>
                    </div>
                  )}
                  
                  {quotesError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 font-medium">Error fetching quotes:</p>
                      <p className="text-red-600">{quotesError}</p>
                    </div>
                  )}
                  
                  {quotes.length > 0 && (
                    <div className="space-y-4">
                      {quotes.map((quote, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-semibold">{quote.aircraft}</h3>
                              <p className="text-gray-600">{quote.company}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">
                                ${quote.price.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">{quote.currency}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Departure:</span> {quote.departure_time}
                            </div>
                            <div>
                              <span className="font-medium">Arrival:</span> {quote.arrival_time}
                            </div>
                            <div>
                              <span className="font-medium">Flight Time:</span> {quote.flight_time}
                            </div>
                            <div>
                              <span className="font-medium">Passengers:</span> {passengers}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!loadingQuotes && !quotesError && quotes.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No quotes available for this route.</p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStep(1)}
                      className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500"
                    >
                      <Search className="mr-2 h-5 w-5" /> New Search
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
