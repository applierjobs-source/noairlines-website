import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, MapPin, Calendar, Users, Plane, Mail, Phone, DollarSign, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RouteData } from "@/routes/routeData"
import Layout from "./Layout"
import JetProgressBar from "./JetProgressBar"

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
  aircraft_image?: string
  aircraft_model?: string
  price: number
  currency: string
  departure_time: string
  arrival_time: string
  flight_time: string
  company: string
}

const AVIATION_EDGE_API_KEY = "ebf7a6-412b1a"

interface RouteLandingPageProps {
  route: RouteData
}

// Example notifications for social proof
const exampleNotifications = [
  { name: "Sarah M.", price: "$12,500" },
  { name: "Michael R.", price: "$18,900" },
  { name: "Jennifer L.", price: "$15,200" },
]

export default function RouteLandingPage({ route }: RouteLandingPageProps) {
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [step, setStep] = useState(1)
  const [fromLocation, setFromLocation] = useState(route.from)
  const [toLocation, setToLocation] = useState(route.to)
  const [currentNotification, setCurrentNotification] = useState(0)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [passengers, setPassengers] = useState(1)
  const [tripType, setTripType] = useState<TripType>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [returnTime, setReturnTime] = useState("")
  const [fromSuggestions, setFromSuggestions] = useState<Airport[]>([])
  const [toSuggestions, setToSuggestions] = useState<Airport[]>([])
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [quotes, setQuotes] = useState<CharterQuote[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<CharterQuote | null>(null)
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  // Initialize locations from route data
  useEffect(() => {
    if (route.fromCode && route.toCode) {
      setFromLocation(`${route.from} (${route.fromCode})`)
      setToLocation(`${route.to} (${route.toCode})`)
    }
  }, [route])

  // Cycle through notifications
  useEffect(() => {
    if (!showBookingForm) {
      const interval = setInterval(() => {
        setCurrentNotification((prev) => (prev + 1) % exampleNotifications.length)
      }, 4000) // Change every 4 seconds

      return () => clearInterval(interval)
    }
  }, [showBookingForm])

  const nextStep = () => {
    if (step === 5 && tripType === "round-trip") {
      setStep(6)
    } else if (step === 5 && tripType === "one-way") {
      setStep(7)
    } else {
      setStep(step + 1)
    }
  }
  
  const prevStep = () => {
    if (step === 8 && tripType === "round-trip") {
      setStep(7)
    } else if (step === 8 && tripType === "one-way") {
      setStep(7)
    } else if (step === 7 && tripType === "round-trip") {
      setStep(6)
    } else if (step === 7 && tripType === "one-way") {
      setStep(5)
    } else if (step === 6 && tripType === "round-trip") {
      setStep(5)
    } else {
      setStep(step - 1)
    }
  }

  const handleBookNow = (quote: CharterQuote) => {
    setSelectedQuote(quote)
    setStep(12)
  }

  const calculateFlightTime = (aircraft: string): string => {
    const fromMatch = fromLocation.match(/\(([A-Z]{3})\)/)
    const toMatch = toLocation.match(/\(([A-Z]{3})\)/)
    const fromCode = fromMatch ? fromMatch[1] : null
    const toCode = toMatch ? toMatch[1] : null
    
    const commonRoutes: Record<string, number> = {
      'AUS->MSY': 105, 'MSY->AUS': 105,
      'AUS->LAX': 180, 'LAX->AUS': 180,
      'AUS->JFK': 210, 'JFK->AUS': 210,
      'AUS->LGA': 210, 'LGA->AUS': 210,
      'AUS->MIA': 165, 'MIA->AUS': 165,
      'AUS->SEA': 240, 'SEA->AUS': 240,
      'AUS->ORD': 135, 'ORD->AUS': 135,
      'JFK->LAX': 360, 'LAX->JFK': 360,
      'LGA->LAX': 360, 'LAX->LGA': 360,
      'LAX->MIA': 270, 'MIA->LAX': 270,
      'ORD->MIA': 150, 'MIA->ORD': 150,
      'JFK->MIA': 165, 'MIA->JFK': 165,
      'LGA->MIA': 165, 'MIA->LGA': 165,
    }
    
    if (fromCode && toCode) {
      const routeKey = `${fromCode}->${toCode}`
      const exactRoute = commonRoutes[routeKey]
      if (exactRoute) {
        const adjustment = {
          'Light': 1.0,
          'Midsize': 0.95,
          'Heavy': 0.90,
          'Ultra Long Range': 0.85
        }[aircraft] || 1.0
        
        const finalTime = Math.round(exactRoute * adjustment)
        const hours = Math.floor(finalTime / 60)
        const minutes = finalTime % 60
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      }
    }
    
    const defaultTimes: Record<string, string> = {
      'Light': '2h 15m',
      'Midsize': '2h 10m',
      'Heavy': '2h 5m',
      'Ultra Long Range': '2h 0m'
    }
    
    return defaultTimes[aircraft] || '2h 0m'
  }

  const handleSubmit = async () => {
    const itineraryData = {
      from: fromLocation,
      to: toLocation,
      date,
      time,
      passengers,
      tripType,
      email,
      phone,
      name,
      returnDate,
      returnTime
    }
    
    console.log('Submitting itinerary:', itineraryData)
    
    try {
      const emailResponse = await fetch('/api/submit-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itineraryData)
      })
      
      const emailResult = await emailResponse.json()
      console.log('Itinerary submitted:', emailResult.success)
    } catch (error) {
      console.error('Error sending email:', error)
    }
    
    setLoadingQuotes(true)
    
    setTimeout(() => {
      const mockQuotes: CharterQuote[] = [
        {
          id: '1',
          aircraft: 'Light',
          aircraft_model: 'Citation CJ3',
          aircraft_image: '/images/aircraft/light-jet.svg',
          price: Math.floor(8000 + Math.random() * 4000),
          currency: 'USD',
          departure_time: `${date}T${time}`,
          arrival_time: '',
          flight_time: calculateFlightTime('Light'),
          company: 'Charter Jet One, Inc.'
        },
        {
          id: '2',
          aircraft: 'Midsize',
          aircraft_model: 'Hawker 800',
          aircraft_image: '/images/aircraft/midsize-jet.svg',
          price: Math.floor(12000 + Math.random() * 5000),
          currency: 'USD',
          departure_time: `${date}T${time}`,
          arrival_time: '',
          flight_time: calculateFlightTime('Midsize'),
          company: 'Integra Jet, LLC'
        },
        {
          id: '3',
          aircraft: 'Heavy',
          aircraft_model: 'Gulfstream G550',
          aircraft_image: '/images/aircraft/heavy-jet.svg',
          price: Math.floor(18000 + Math.random() * 8000),
          currency: 'USD',
          departure_time: `${date}T${time}`,
          arrival_time: '',
          flight_time: calculateFlightTime('Heavy'),
          company: 'Secure Air Charter'
        },
        {
          id: '4',
          aircraft: 'Ultra Long Range',
          aircraft_model: 'Global 7500',
          aircraft_image: '/images/aircraft/ultra-long-range-jet.svg',
          price: Math.floor(25000 + Math.random() * 10000),
          currency: 'USD',
          departure_time: `${date}T${time}`,
          arrival_time: '',
          flight_time: calculateFlightTime('Ultra Long Range'),
          company: 'GFK Flight Support'
        }
      ]
      
      setQuotes(mockQuotes)
      setLoadingQuotes(false)
      setStep(11)
    }, 1500)
  }

  const searchAirports = async (query: string): Promise<Airport[]> => {
    if (query.length < 2) return []
    
    try {
      if (query.length <= 4) {
        try {
          const response = await fetch(
            `https://aviation-edge.com/v2/public/airportDatabase?key=${AVIATION_EDGE_API_KEY}&codeIataAirport=${encodeURIComponent(query.toUpperCase())}`,
            {
              method: 'GET',
              mode: 'cors',
              headers: {
                'Accept': 'application/json',
              },
            }
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data && !Array.isArray(data)) {
              return [data]
            } else if (Array.isArray(data) && data.length > 0) {
              return data
            }
          }
        } catch (codeError) {
          console.error('Airport code search failed:', codeError)
        }
      }
      
      const endpoints = [
        `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&city=${encodeURIComponent(query)}`,
        `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&q=${encodeURIComponent(query)}`,
        `https://aviation-edge.com/v2/public/autocomplete?key=${AVIATION_EDGE_API_KEY}&search=${encodeURIComponent(query)}`
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data)) {
              return data
            } else if (data && Array.isArray(data.airportsByCities)) {
              return data.airportsByCities
            } else if (data && Array.isArray(data.cities)) {
              return data.cities
            } else if (data && Array.isArray(data.airports)) {
              return data.airports
            } else if (data && Array.isArray(data.results)) {
              return data.results
            } else if (data && typeof data === 'object') {
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  return data[key]
                }
              }
            }
          }
        } catch (endpointError) {
          continue
        }
      }
      
      throw new Error('All API endpoints failed')
    } catch (error) {
      console.error('Error fetching airports from API:', error)
      return []
    }
  }

  const sortAndFilterResults = (results: any[], query: string): any[] => {
    if (!results || results.length === 0) return []
    
    const queryLower = query.toLowerCase().trim()
    const validResults = results.filter(airport => {
      const hasValidName = airport.nameAirport || airport.nameCity || airport.city || airport.nameIata || airport.name
      const hasValidCode = airport.codeIataAirport || airport.codeIata || airport.iata || airport.code
      return hasValidName || hasValidCode
    })
    
    if (validResults.length === 0) return []
    
    const scoredResults = validResults.map(airport => {
      let score = 0
      const airportName = (airport.nameAirport || '').toLowerCase()
      const cityName = (airport.nameCity || '').toLowerCase()
      const airportCode = (airport.codeIataAirport || '').toLowerCase()
      
      if (airportCode === queryLower) score += 1000
      if (airportName.startsWith(queryLower)) score += 500
      if (airportName.includes(queryLower)) score += 200
      if (cityName.startsWith(queryLower)) score += 150
      if (cityName.includes(queryLower)) score += 100
      
      return { ...airport, score }
    })
    
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }

  const handleFromLocationChange = async (value: string) => {
    setFromLocation(value)
    if (value.length >= 2) {
      const airports = await searchAirports(value)
      const sortedAirports = sortAndFilterResults(airports, value)
      setFromSuggestions(sortedAirports)
      setShowFromSuggestions(sortedAirports.length > 0)
    } else {
      setFromSuggestions([])
      setShowFromSuggestions(false)
    }
  }

  const handleToLocationChange = async (value: string) => {
    setToLocation(value)
    if (value.length >= 2) {
      const airports = await searchAirports(value)
      const sortedAirports = sortAndFilterResults(airports, value)
      setToSuggestions(sortedAirports)
      setShowToSuggestions(sortedAirports.length > 0)
    } else {
      setToSuggestions([])
      setShowToSuggestions(false)
    }
  }

  const formatAirportDisplay = (airport: any): string => {
    const airportName = airport.nameAirport || 
                       airport.nameCity || 
                       airport.city ||
                       airport.nameIata || 
                       airport.name || 
                       'Unknown'
    const code = airport.codeIataAirport || 
                 airport.codeIata || 
                 airport.iata || 
                 airport.code ||
                 ''
    return code ? `${airportName} (${code})` : airportName
  }

  const getAirportName = (airport: any): string => {
    return airport.nameAirport || 
           airport.nameCity ||
           airport.city ||
           airport.name || 
           'Unknown Airport'
  }

  const getAirportLocation = (airport: any): string => {
    const city = airport.nameCity || airport.city || ''
    const country = airport.nameCountry || airport.country || ''
    return city && country ? `${city} • ${country}` : (city || country || 'Unknown Location')
  }

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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

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
    <Layout>
      {!showBookingForm ? (
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
          {/* Social Proof Notification Bubble - Bottom Left */}
          <motion.div
            key={currentNotification}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-6 bg-white border border-zinc-200 rounded-2xl shadow-lg px-4 py-3 max-w-xs z-10"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Plane className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-900 font-medium">
                  <span className="font-semibold">{exampleNotifications[currentNotification].name}</span> just chartered a jet for{" "}
                  <span className="font-semibold text-blue-600">{exampleNotifications[currentNotification].price}</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">2 minutes ago</p>
              </div>
            </div>
          </motion.div>

          <div className="w-full max-w-4xl space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                {route.title}
              </h1>
              {/* 5-Star Quality Rating */}
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="ml-2 text-sm text-zinc-600 font-medium">Premium Service</span>
              </div>
              <p className="text-xl md:text-2xl text-zinc-600 font-medium">
                Fly from {route.from} to {route.to} on a Private Jet 🛩
              </p>
              <Button
                onClick={() => setShowBookingForm(true)}
                className="mt-8 h-14 px-8 text-lg bg-blue-600 hover:bg-blue-500"
              >
                Get Quotes <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-lg md:text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed pt-4">
                {route.description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-2xl">
            {/* Progress Bar */}
            <div className="mb-8">
              <JetProgressBar step={step} totalSteps={12} />
            </div>

            <AnimatePresence mode="wait">
              {/* Include all booking steps from App.tsx - I'll include the key steps */}
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
                  key="step7"
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

              {/* Step 8: Phone */}
              {step === 8 && (
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
                    <Phone className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      What's your phone number?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
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
                        disabled={!phone.trim()}
                        className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 9: Name */}
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

              {/* Step 10: Summary */}
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
                        <div className="text-sm text-zinc-600">{phone}</div>
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

              {/* Step 11: Charter Quotes */}
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
                    <DollarSign className="h-16 w-16 mx-auto text-blue-600" />
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      Available Flights
                    </h1>
                    <p className="text-lg text-zinc-600">
                      {fromLocation} → {toLocation}
                    </p>
                  </div>
                  
                  {loadingQuotes && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-zinc-600">Fetching available flights...</p>
                    </div>
                  )}
                  
                  {quotes.length > 0 && (
                    <div className="space-y-4">
                      {quotes.map((quote, index) => {
                        const priceMin = quote.price;
                        const priceMax = quote.price * 4;
                        return (
                        <div key={index} className="border border-zinc-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow bg-white">
                          <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-shrink-0 mx-auto md:mx-0">
                              {quote.aircraft_image ? (
                                <img 
                                  src={quote.aircraft_image} 
                                  alt={`${quote.aircraft} aircraft`}
                                  className="w-full max-w-sm h-40 md:w-48 md:h-32 object-contain rounded-lg bg-zinc-100 p-2"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full max-w-sm h-40 md:w-48 md:h-32 bg-zinc-100 rounded-lg flex items-center justify-center">
                                  <Plane className="h-12 w-12 text-zinc-400" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 flex flex-col md:flex-row md:justify-between items-center md:items-start text-center md:text-left">
                              <div className="mb-3 md:mb-0">
                                <h3 className="text-xl font-semibold text-black">{quote.aircraft}</h3>
                                {quote.aircraft_model && (
                                  <p className="text-sm text-zinc-600 mb-1">{quote.aircraft_model}</p>
                                )}
                              </div>
                              <div className="md:text-right">
                                <div className="text-3xl md:text-4xl font-bold text-blue-600">
                                  ${priceMin.toLocaleString()}-${priceMax.toLocaleString()}
                                </div>
                                <div className="text-sm text-zinc-500">{quote.currency}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm border-t border-zinc-200 pt-4 mb-4">
                            <div>
                              <span className="font-medium text-zinc-600">Departure:</span> 
                              <span className="ml-2 text-black">
                                {quote.departure_time 
                                  ? new Date(quote.departure_time).toLocaleString('en-US', {
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: 'numeric', 
                                      minute: '2-digit'
                                    })
                                  : `${date} at ${time}`}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-zinc-600">Flight Time:</span> 
                              <span className="ml-2 text-black">{quote.flight_time || 'TBD'}</span>
                            </div>
                            <div className="md:col-span-2">
                              <span className="font-medium text-zinc-600">Passengers:</span> 
                              <span className="ml-2 text-black">{passengers}</span>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleBookNow(quote)}
                            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500"
                          >
                            Enquire Now
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!loadingQuotes && quotes.length === 0 && (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-semibold mb-2">Thank you!</h2>
                      <p className="text-zinc-600 max-w-md mx-auto">
                        We have received your itinerary. You will receive a quote to your inbox within 1 hour.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStep(1)}
                      className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-500"
                    >
                      New Search
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 12: Thank You Page */}
              {step === 12 && (
                <motion.div
                  key="step12"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      Thank you!
                    </h1>
                    <p className="text-lg text-zinc-600">
                      Please allow up to one hour while we secure the best possible price for you.
                    </p>
                    
                    {selectedQuote && (
                      <div className="mt-8 bg-zinc-50 rounded-xl p-6 max-w-md mx-auto">
                        <h2 className="text-xl font-semibold mb-4">Your Selected Flight</h2>
                        <div className="space-y-2 text-left">
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Aircraft:</span>
                            <span className="font-semibold">{selectedQuote.aircraft}</span>
                          </div>
                          {selectedQuote.aircraft_model && (
                            <div className="flex justify-between">
                              <span className="text-zinc-600">Model:</span>
                              <span className="font-semibold">{selectedQuote.aircraft_model}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Price:</span>
                            <span className="font-semibold text-blue-600">
                              ${selectedQuote.price.toLocaleString()}-${(selectedQuote.price * 4).toLocaleString()} {selectedQuote.currency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Route:</span>
                            <span className="font-semibold">
                              {fromLocation} → {toLocation}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-zinc-600 mt-8">
                      You will receive a confirmation email shortly with all the details.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Layout>
  )
}

