import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, MapPin, Calendar, Users, Plane, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TripType = "one-way" | "round-trip" | null

interface Airport {
  codeIata?: string
  codeIcao?: string
  name?: string
  city?: string
  country?: string
  // Aviation Edge API fields
  nameIata?: string
  nameAirport?: string
  nameCountry?: string
  codeIataAirport?: string
  codeIcaoAirport?: string
  codeIso2Country?: string
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
    } else if (step === 5 && tripType === "one-way") {
      setStep(7) // Skip return flight step for one-way
    } else {
      setStep(step + 1)
    }
  }
  
  const prevStep = () => {
    // If on email step and round-trip, go back to return flight step
    if (step === 7 && tripType === "round-trip") {
      setStep(6) // Go back to return flight step
    } else if (step === 7 && tripType === "one-way") {
      setStep(5) // Go back to trip type selection for one-way
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

        // Airport search function using Aviation Edge API
        const searchAirports = async (query: string): Promise<Airport[]> => {
          if (query.length < 2) return []
          
          try {
            console.log('Making API request for:', query)
            
            // Try multiple API endpoints with different search strategies
            const endpoints = [
              // First try exact airport code search
              `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&airport=${encodeURIComponent(query)}`,
              // Then try city search
              `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&city=${encodeURIComponent(query)}`,
              // Then try general search
              `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&q=${encodeURIComponent(query)}`,
              // Finally try search parameter
              `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&search=${encodeURIComponent(query)}`
            ]
      
      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint)
          
          const response = await fetch(endpoint, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          })
          
          console.log('Response status:', response.status)
          console.log('Response headers:', Object.fromEntries(response.headers.entries()))
          
          if (response.ok) {
            const data = await response.json()
            console.log('API Response data:', data)
            console.log('Response type:', typeof data)
            console.log('Is array:', Array.isArray(data))
            
            // Handle different response formats
            if (Array.isArray(data)) {
              console.log('Returning array data:', data)
              return data
            } else if (data && Array.isArray(data.airportsByCities)) {
              console.log('Returning airportsByCities array:', data.airportsByCities)
              return data.airportsByCities
            } else if (data && Array.isArray(data.cities)) {
              console.log('Returning cities array:', data.cities)
              return data.cities
            } else if (data && Array.isArray(data.airports)) {
              console.log('Returning airports array:', data.airports)
              return data.airports
            } else if (data && Array.isArray(data.results)) {
              console.log('Returning results array:', data.results)
              return data.results
            } else if (data && typeof data === 'object') {
              console.log('Data is object, checking for arrays inside:', Object.keys(data))
              // Check if any property is an array
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  console.log(`Found array property: ${key}`, data[key])
                  return data[key]
                }
              }
            }
            
            console.log('No valid array found in response')
          }
        } catch (endpointError) {
          console.log('Endpoint failed:', endpointError)
          continue
        }
      }
      
            // If all endpoints fail, try with a proxy or different approach
            throw new Error('All API endpoints failed')
            
          } catch (error) {
            console.error('Error fetching airports from API:', error)
            
            // Try alternative approach - fetch from airports database
            try {
              console.log('Trying airports database endpoint...')
              const response = await fetch(
                `https://aviation-edge.com/v2/public/airports?key=${AVIATION_EDGE_API_KEY}`,
                {
                  method: 'GET',
                  mode: 'cors',
                  headers: {
                    'Accept': 'application/json',
                  },
                }
              )
              
              if (response.ok) {
                const allAirports = await response.json()
                console.log('Got all airports, filtering for:', query)
                
                const filtered = allAirports.filter((airport: any) => 
                  airport.nameIata && (
                    airport.nameIata.toLowerCase().includes(query.toLowerCase()) ||
                    airport.nameAirport?.toLowerCase().includes(query.toLowerCase()) ||
                    airport.nameCountry?.toLowerCase().includes(query.toLowerCase()) ||
                    airport.codeIataAirport?.toLowerCase().includes(query.toLowerCase())
                  )
                ).slice(0, 10)
                
                console.log('Filtered results:', filtered)
                return filtered
              }
            } catch (dbError) {
              console.error('Database endpoint also failed:', dbError)
            }
            
            return []
          }
        }

        // Helper function to sort and filter results intelligently
        const sortAndFilterResults = (results: any[], query: string): any[] => {
          if (!results || results.length === 0) return []
          
          const queryLower = query.toLowerCase().trim()
          
          // Define US states for better filtering
          const usStates = [
            'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
            'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
            'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
            'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
            'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
            'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
            'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
            'wisconsin', 'wyoming'
          ]
          
          const isUSStateQuery = usStates.includes(queryLower)
          
          // Score and sort results
          const scoredResults = results.map(airport => {
            let score = 0
            const airportName = (airport.nameAirport || '').toLowerCase()
            const cityName = (airport.nameCity || '').toLowerCase()
            const countryName = (airport.nameCountry || '').toLowerCase()
            const airportCode = (airport.codeIataAirport || '').toLowerCase()
            
            // Exact airport code match (highest priority)
            if (airportCode === queryLower) {
              score += 1000
            }
            
            // Airport name starts with query (high priority)
            if (airportName.startsWith(queryLower)) {
              score += 500
            }
            
            // Airport name contains query
            if (airportName.includes(queryLower)) {
              score += 200
            }
            
            // City name starts with query
            if (cityName.startsWith(queryLower)) {
              score += 150
            }
            
            // City name contains query
            if (cityName.includes(queryLower)) {
              score += 100
            }
            
            // Country/state matching
            if (countryName.includes(queryLower)) {
              score += 50
            }
            
            // US state query prioritization
            if (isUSStateQuery && countryName.includes('united states')) {
              score += 200
            }
            
            // Penalize non-US results for US state queries
            if (isUSStateQuery && !countryName.includes('united states')) {
              score -= 100
            }
            
            return { ...airport, score }
          })
          
          // Sort by score (highest first) and return top 8 results
          return scoredResults
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
        }

  // Handle from location input
  const handleFromLocationChange = async (value: string) => {
    setFromLocation(value)
    if (value.length >= 2) {
      console.log('Searching for:', value) // Debug log
      const airports = await searchAirports(value)
      console.log('Found airports:', airports) // Debug log
      const sortedAirports = sortAndFilterResults(airports, value)
      console.log('Sorted airports:', sortedAirports)
      setFromSuggestions(sortedAirports)
      setShowFromSuggestions(sortedAirports.length > 0)
    } else {
      setFromSuggestions([])
      setShowFromSuggestions(false)
    }
  }

  // Handle to location input
  const handleToLocationChange = async (value: string) => {
    setToLocation(value)
    if (value.length >= 2) {
      console.log('Searching for:', value) // Debug log
      const airports = await searchAirports(value)
      console.log('Found airports:', airports) // Debug log
      const sortedAirports = sortAndFilterResults(airports, value)
      console.log('Sorted airports:', sortedAirports)
      setToSuggestions(sortedAirports)
      setShowToSuggestions(sortedAirports.length > 0)
    } else {
      setToSuggestions([])
      setShowToSuggestions(false)
    }
  }

  // Helper function to format airport display
  const formatAirportDisplay = (airport: any): string => {
    console.log('Formatting airport:', airport) // Debug log
    
    // Based on Aviation Edge API response: use nameAirport and codeIataAirport
    const airportName = airport.nameAirport || 
                       airport.nameCity || 
                       airport.nameIata || 
                       airport.name || 
                       airport.cityName ||
                       airport.nameCity ||
                       'Unknown'
    
    const code = airport.codeIataAirport || 
                 airport.codeIata || 
                 airport.codeIataCity ||
                 airport.iata || 
                 airport.airportCode ||
                 airport.code ||
                 ''
    
    return code ? `${airportName} (${code})` : airportName
  }

  // Helper function to get airport name
  const getAirportName = (airport: any): string => {
    console.log('Available fields for airport name:', Object.keys(airport))
    console.log('All airport data:', airport)
    
    // Aviation Edge API uses 'nameAirport' as the primary field for airport names
    const airportName = airport.nameAirport || 
                       airport.name || 
                       airport.airportName ||
                       airport.airport ||
                       airport.nameIata || 
                       airport.airportNameIata ||
                       airport.airportNameAirport ||
                       airport.nameAirportIata ||
                       airport.city || 
                       'Unknown Airport'
    
    console.log('Selected airport name:', airportName)
    console.log('nameAirport field value:', airport.nameAirport)
    return airportName
  }

  // Helper function to get airport location
  const getAirportLocation = (airport: any): string => {
    const city = airport.nameCity || 
                 airport.city || 
                 airport.nameIata || 
                 airport.cityName ||
                 airport.cityIata ||
                 ''
    
    const country = airport.nameCountry || 
                    airport.country || 
                    airport.countryName ||
                    airport.countryIata ||
                    airport.codeIso2Country ||
                    ''
    
    console.log('Location - city:', city, 'country:', country)
    
    return city && country ? `${city} • ${country}` : (city || country || 'Unknown Location')
  }

  // Select airport from suggestions
  const selectFromAirport = (airport: Airport) => {
    setFromLocation(formatAirportDisplay(airport))
    setFromSuggestions([])
    setShowFromSuggestions(false)
  }

  const selectToAirport = (airport: Airport) => {
    setToLocation(formatAirportDisplay(airport))
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
                              {formatAirportDisplay(airport)}
                            </div>
                            <div className="text-sm text-zinc-600">
                              {getAirportName(airport)} • {getAirportLocation(airport)}
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
                              {formatAirportDisplay(airport)}
                            </div>
                            <div className="text-sm text-zinc-600">
                              {getAirportName(airport)} • {getAirportLocation(airport)}
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
