import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, MapPin, Calendar, Users, Plane, Mail, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TestPage from "./TestPage"

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

export default function NoAirlinesBooking() {
  // Check if we're on the test page
  const isTestPage = window.location.pathname === '/test'
  
  // If on test page, render TestPage component
  if (isTestPage) {
    return <TestPage />
  }
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
  const [selectedQuote, setSelectedQuote] = useState<CharterQuote | null>(null)
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

  const handleBookNow = (quote: CharterQuote) => {
    setSelectedQuote(quote)
    setStep(11)
  }

  // Calculate flight time based on route and aircraft type
  const calculateFlightTime = (aircraft: string): string => {
    // Extract airport codes or use city names
    const fromStr = fromLocation.toLowerCase()
    const toStr = toLocation.toLowerCase()
    
    // Try to extract airport codes (format: "Airport Name (ABC)")
    const fromMatch = fromLocation.match(/\(([A-Z]{3})\)/)
    const toMatch = toLocation.match(/\(([A-Z]{3})\)/)
    const fromCode = fromMatch ? fromMatch[1] : null
    const toCode = toMatch ? toMatch[1] : null
    
    // Common routes database (approximate flight times in minutes)
    const commonRoutes: Record<string, number> = {
      // Austin to New Orleans
      'AUS->MSY': 105,
      'MSY->AUS': 105,
      
      // Austin to Los Angeles
      'AUS->LAX': 180,
      'LAX->AUS': 180,
      
      // Austin to New York
      'AUS->JFK': 210,
      'JFK->AUS': 210,
      'AUS->LGA': 210,
      'LGA->AUS': 210,
      
      // Austin to Miami
      'AUS->MIA': 165,
      'MIA->AUS': 165,
      
      // Austin to Seattle
      'AUS->SEA': 240,
      'SEA->AUS': 240,
      
      // Austin to Chicago
      'AUS->ORD': 135,
      'ORD->AUS': 135,
      
      // New York to Los Angeles
      'JFK->LAX': 360,
      'LAX->JFK': 360,
      'LGA->LAX': 360,
      'LAX->LGA': 360,
      
      // Los Angeles to Miami
      'LAX->MIA': 270,
      'MIA->LAX': 270,
      
      // Chicago to Miami
      'ORD->MIA': 150,
      'MIA->ORD': 150,
      
      // New York to Miami
      'JFK->MIA': 165,
      'MIA->JFK': 165,
      'LGA->MIA': 165,
      'MIA->LGA': 165,
    }
    
    // Look up exact route if airport codes are available
    if (fromCode && toCode) {
      const routeKey = `${fromCode}->${toCode}`
      const exactRoute = commonRoutes[routeKey]
      if (exactRoute) {
        // Adjust based on aircraft type (heavier/larger jets are typically faster)
        const adjustment = {
          'Light': 1.0,         // Citation speed
          'Midsize': 0.95,       // Hawker slightly faster
          'Heavy': 0.90,         // Gulfstream faster
          'Ultra Long Range': 0.85 // Global fastest
        }[aircraft] || 1.0
        
        const finalTime = Math.round(exactRoute * adjustment)
        const hours = Math.floor(finalTime / 60)
        const minutes = finalTime % 60
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      }
    }
    
    // Estimate based on city names
    const cityKey = (fromStr + ' to ' + toStr).toLowerCase()
    if (cityKey.includes('austin') && cityKey.includes('orleans')) {
      const time = aircraft === 'Light' ? 105 : aircraft === 'Midsize' ? 100 : aircraft === 'Heavy' ? 95 : 90
      return time >= 60 ? `${Math.floor(time/60)}h ${time%60}m` : `${time}m`
    }
    if (cityKey.includes('austin') && cityKey.includes('los angeles')) {
      const time = aircraft === 'Light' ? 180 : aircraft === 'Midsize' ? 170 : aircraft === 'Heavy' ? 165 : 155
      return `${Math.floor(time/60)}h ${time%60}m`
    }
    if (cityKey.includes('austin') && cityKey.includes('new york')) {
      const time = aircraft === 'Light' ? 210 : aircraft === 'Midsize' ? 200 : aircraft === 'Heavy' ? 190 : 180
      return `${Math.floor(time/60)}h ${time%60}m`
    }
    if (cityKey.includes('new york') && cityKey.includes('los angeles')) {
      const time = aircraft === 'Light' ? 360 : aircraft === 'Midsize' ? 340 : aircraft === 'Heavy' ? 320 : 300
      return `${Math.floor(time/60)}h ${time%60}m`
    }
    
    // Default estimation for unknown routes (estimated based on typical speeds)
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
      name,
      returnDate,
      returnTime
    }
    
    console.log('Submitting itinerary:', itineraryData)
    
    // Send email notification
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
    
    // Generate mock quotes
    setLoadingQuotes(true)
    
    // Simulate API delay
    setTimeout(() => {
      const mockQuotes: CharterQuote[] = [
        {
          id: '1',
          aircraft: 'Light',
          aircraft_model: 'Citation CJ3',
          aircraft_image: 'https://flyusa.com/wp-content/uploads/2022/10/Cessna-Citation-Jet.jpg',
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
          aircraft_image: 'https://cdn.prod.website-files.com/65a0f5e2f3a73fc7e30e9205/65afc9d515cf52cead9ada4e_53416239464_9dd989950f_k.webp',
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
          aircraft_image: 'https://www.jetaviation.com/wp-content/uploads/2024/10/IMG_7040.jpg',
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
          aircraft_image: 'https://aerocorner.com/wp-content/uploads/2020/02/Bombardier-Global-7500-Bombardier-N750GX.jpg',
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
      setStep(10)
    }, 1500) // 1.5 second loading delay
  }

        // Airport search function using Aviation Edge API
        const searchAirports = async (query: string): Promise<Airport[]> => {
          if (query.length < 2) return []
          
          try {
            console.log('Making API request for:', query)
            
            // For short queries (likely airport codes), try exact airport code search first
            if (query.length <= 4) {
              console.log('Short query detected, trying exact airport code search')
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
                
                console.log('Airport code search response status:', response.status)
                
                if (response.ok) {
                  const data = await response.json()
                  console.log('Airport code search response:', data)
                  
                  // The airportDatabase endpoint returns a single airport object or array
                  if (data && !Array.isArray(data)) {
                    console.log('Found exact airport code match:', data)
                    return [data]
                  } else if (Array.isArray(data) && data.length > 0) {
                    console.log('Found exact airport code matches:', data)
                    return data
                  }
                }
              } catch (codeError) {
                console.error('Airport code search failed:', codeError)
              }
            }
            
            // Try multiple API endpoints with different search strategies
            const endpoints = [
              // Try city search
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
          
          if (response.ok) {
            const data = await response.json()
            console.log('API Response data:', data)
            
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
            return []
          }
        }

        // Helper function to sort and filter results intelligently
        const sortAndFilterResults = (results: any[], query: string): any[] => {
          if (!results || results.length === 0) return []
          
          const queryLower = query.toLowerCase().trim()
          
          console.log('Sorting results for query:', query, 'Results:', results)
          
          // Filter out results that would display as "Unknown" or have no meaningful data
          const validResults = results.filter(airport => {
            const hasValidName = airport.nameAirport || airport.nameCity || airport.city || airport.nameIata || airport.name
            const hasValidCode = airport.codeIataAirport || airport.codeIata || airport.iata || airport.code
            
            // Only include results that have at least a name or code
            return hasValidName || hasValidCode
          })
          
          if (validResults.length === 0) {
            console.log('No valid results after filtering, returning empty array')
            return []
          }
          
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
          const scoredResults = validResults.map(airport => {
            let score = 0
            const airportName = (airport.nameAirport || '').toLowerCase()
            const cityName = (airport.nameCity || '').toLowerCase()
            const countryName = (airport.nameCountry || '').toLowerCase()
            const airportCode = (airport.codeIataAirport || '').toLowerCase()
            
            console.log('Scoring airport:', airport.nameAirport, 'Code:', airportCode, 'Query:', queryLower)
            
            // Exact airport code match (highest priority)
            if (airportCode === queryLower) {
              score += 1000
              console.log('Exact code match! Score:', score)
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
            
            // Penalize airports that don't match the query at all
            if (airportCode !== queryLower && 
                !airportName.includes(queryLower) && 
                !cityName.includes(queryLower)) {
              score -= 500 // Heavy penalty for irrelevant results
            }
            
            console.log('Final score for', airport.nameAirport, ':', score)
            return { ...airport, score }
          })
          
          // Sort by score (highest first) and return top 8 results
          const sorted = scoredResults
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
          
          console.log('Sorted results:', sorted.map(r => ({ name: r.nameAirport, code: r.codeIataAirport, score: r.score })))
          return sorted
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
    console.log('DEBUG: Formatting airport object:', airport)
    console.log('DEBUG: Available keys:', Object.keys(airport))
    
    // Try more comprehensive field mapping for incomplete API responses
    const airportName = airport.nameAirport || 
                       airport.nameCity || 
                       airport.city ||
                       airport.nameIata || 
                       airport.name || 
                       airport.cityName ||
                       airport.airport ||
                       airport.airportName ||
                       'Unknown'
    
    const code = airport.codeIataAirport || 
                 airport.codeIata || 
                 airport.codeIataCity ||
                 airport.iata || 
                 airport.airportCode ||
                 airport.code ||
                 airport.airportCode ||
                 ''
    
    console.log('DEBUG: Formatted result - name:', airportName, 'code:', code)
    return code ? `${airportName} (${code})` : airportName
  }

  // Helper function to get airport name
  const getAirportName = (airport: any): string => {
    console.log('DEBUG: Getting airport name for object:', airport)
    console.log('DEBUG: Available keys for name:', Object.keys(airport))
    
    // Try comprehensive field mapping, with city as fallback instead of "Unknown Airport"
    const airportName = airport.nameAirport || 
                       airport.nameCity ||
                       airport.city ||
                       airport.name || 
                       airport.airportName ||
                       airport.airport ||
                       airport.nameIata || 
                       airport.airportNameIata ||
                       airport.airportNameAirport ||
                       airport.nameAirportIata ||
                       airport.airportCode ||
                       'Unknown Airport'
    
    console.log('DEBUG: Selected airport name:', airportName)
    return airportName
  }

  // Helper function to get airport location
  const getAirportLocation = (airport: any): string => {
    console.log('DEBUG: Getting location for object:', airport)
    
    const city = airport.nameCity || 
                 airport.city || 
                 airport.nameIata || 
                 airport.cityName ||
                 airport.cityIata ||
                 airport.nameAirport ||
                 airport.airportName ||
                 ''
    
    const country = airport.nameCountry || 
                    airport.country || 
                    airport.countryName ||
                    airport.countryIata ||
                    airport.codeIso2Country ||
                    ''
    
    console.log('DEBUG: Location - city:', city, 'country:', country)
    
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
                    animate={{ width: `${(step / 11) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-zinc-600">Step {step} of 11</span>
                <span className="text-xs text-zinc-600">{Math.round((step / 11) * 100)}%</span>
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

            {/* Step 10: Charter Quotes */}
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
                    {quotes.map((quote, index) => (
                      <div key={index} className="border border-zinc-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow bg-white">
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                          {/* Aircraft Image */}
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
                          
                          {/* Quote Details */}
                          <div className="flex-1 flex flex-col md:flex-row md:justify-between items-center md:items-start text-center md:text-left">
                            <div className="mb-3 md:mb-0">
                              <h3 className="text-xl font-semibold text-black">{quote.aircraft}</h3>
                              {quote.aircraft_model && (
                                <p className="text-sm text-zinc-600 mb-1">{quote.aircraft_model}</p>
                              )}
                            </div>
                            <div className="md:text-right">
                              <div className="text-3xl md:text-4xl font-bold text-blue-600">
                                ${quote.price.toLocaleString()}
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
                          Book Now
                        </Button>
                      </div>
                    ))}
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

            {/* Step 11: Thank You Page */}
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
                  <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Thank you!
                  </h1>
                  <p className="text-lg text-zinc-600">
                    Please allow 1 hour for us to secure this flight for you.
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
                            ${selectedQuote.price.toLocaleString()} {selectedQuote.currency}
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
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep(1)}
                    className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-500"
                  >
                    Book Another Flight
                  </Button>
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
