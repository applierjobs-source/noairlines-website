import React, { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Plane, MapPin, Calendar, Users, ArrowRight, ShieldCheck, Clock, Phone, Mail, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// Sleek black, white & red private jet charter landing page
// TailwindCSS + shadcn/ui + Framer Motion

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-3xl md:text-4xl font-semibold tracking-tight text-white">{value}</div>
    <div className="text-xs md:text-sm text-red-400 mt-1 uppercase tracking-wider">{label}</div>
  </div>
)

/** SmartImage
 * Tries multiple sources in order; on error, advances to the next.
 * Adds referrerPolicy to avoid hotlink 403s and uses a final SVG fallback.
 */
function SmartImage({ sources, alt, seed }: { sources: string[]; alt: string; seed: string }) {
  const [idx, setIdx] = useState(0)
  const src = sources[idx]
  const fallbackSvg = useMemo(() => {
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'>
         <defs>
           <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
             <stop offset='0%' stop-color='#0a0a0a'/>
             <stop offset='100%' stop-color='#111111'/>
           </linearGradient>
         </defs>
         <rect width='100%' height='100%' fill='url(#g)'/>
         <g fill='#ef4444' opacity='0.9' font-family='system-ui, -apple-system, Segoe UI, Roboto' text-anchor='middle'>
           <text x='50%' y='52%' font-size='42'>${alt.replace(/</g, "&lt;")}</text>
         </g>
       </svg>`
    )
    return `data:image/svg+xml;charset=utf-8,${svg}`
  }, [alt])

  const handleError = () => {
    if (idx < sources.length - 1) setIdx(idx + 1)
  }

  return (
    <img
      src={src || fallbackSvg}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover"
      data-testid="fleet-image"
      referrerPolicy="no-referrer"
      onError={(e) => {
        // when last candidate fails, swap to inline SVG fallback
        if (idx >= sources.length - 1) (e.currentTarget as HTMLImageElement).src = fallbackSvg
        handleError()
      }}
    />
  )
}

const FleetCard = (
  { title, range, pax, images, alt, seed }:
  { title: string; range: string; pax: string; images: string[]; alt: string; seed: string }
) => (
  <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur" data-testid="fleet-card">
    <CardHeader>
      <CardTitle className="text-white text-lg flex items-center justify-between">
        <span>{title}</span>
        <Plane className="h-5 w-5 text-red-400" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
        <SmartImage sources={images} alt={alt} seed={seed} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-zinc-300">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-red-500" /> {range}</div>
        <div className="flex items-center gap-2 justify-end"><Users className="h-4 w-4 text-red-500" /> {pax}</div>
      </div>
      <Button className="mt-4 w-full bg-red-600 text-white hover:bg-red-500">View details</Button>
    </CardContent>
  </Card>
)

const FooterLink = ({ children }: { children: React.ReactNode }) => (
  <a href="#" className="text-zinc-400 hover:text-red-400 transition-colors text-sm">{children}</a>
)

export default function CharterJetLanding() {
  // Lightweight runtime sanity checks ("test cases") that won't break the build
  useEffect(() => {
    try {
      console.assert(document.querySelectorAll('[data-testid="fleet-card"]').length >= 6, "Expected at least 6 fleet cards")
      console.assert(document.querySelectorAll('[data-testid="fleet-image"]').length >= 6, "Expected at least 6 fleet images")
      console.assert(!!document.querySelector('#destinations'), "Destinations section missing")
      console.assert(!!document.querySelector('#safety'), "Safety section missing")
      console.assert(!!document.querySelector('#contact'), "Contact (footer) section missing")
    } catch (_) { /* ignore in SSR/non-DOM */ }
  }, [])

  // Image source candidates per category. First: Unsplash Source keyword; Second: direct image CDN; Final: picsum seed.
  const img = {
    vlj: [
      "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=1600&auto=format&fit=crop",
      "https://picsum.photos/seed/vlj/1200/675"
    ],
    light: [
      "https://images.unsplash.com/photo-1541264161754-445bbdd7de9b?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519677100203-a0e668c92439?q=80&w=1600&auto=format&fit=crop",
      "https://picsum.photos/seed/lightjet/1200/675"
    ],
    midsize: [
      "https://images.unsplash.com/photo-1518306727298-4c17e1bf8cfb?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1549068106-b024baf5062d?q=80&w=1600&auto=format&fit=crop",
      "https://picsum.photos/seed/midsizejet/1200/675"
    ],
    super: [
      "https://images.unsplash.com/photo-1558980853-bbe1d4ac5d52?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502303756787-90e6d22d0f68?q=80&w=1600&auto=format&fit=crop",
      "https://picsum.photos/seed/supermidsize/1200/675"
    ],
    heavy: [
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?q=80&w=1600&auto=format&fit=crop",
      "https://picsum.photos/seed/heavyjet/1200/675"
    ],
    ultra: [
      "https://images.unsplash.com/photo-1531829039722-d3fb3e705a4b?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?q=80&w=1600&auto=format&fit=crop",
      "https://picsum.photos/seed/ultralong/1200/675"
    ]
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-red-600 selection:text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-zinc-900/80 bg-black/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-red-600 flex items-center justify-center"><Plane className="h-4 w-4 text-white" /></div>
              <span className="font-semibold tracking-tight text-white">NoAirlines</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#fleet" className="text-zinc-300 hover:text-red-400">Fleet</a>
              <a href="#destinations" className="text-zinc-300 hover:text-red-400">Destinations</a>
              <a href="#safety" className="text-zinc-300 hover:text-red-400">Safety</a>
              <a href="#contact" className="text-zinc-300 hover:text-red-400">Contact</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button className="bg-red-600 text-white hover:bg-red-500">Book Now</Button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-[-10%] h-72 w-72 md:h-[28rem] md:w-[28rem] rounded-full bg-red-600/10 blur-3xl" />
          <div className="absolute -bottom-24 left-[-10%] h-72 w-72 md:h-[28rem] md:w-[28rem] rounded-full bg-zinc-800/40 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
                Private Jet Charter, Simplified.
              </h1>
              <p className="mt-4 text-lg text-zinc-300 max-w-prose">
                On-demand aircraft, transparent pricing, and white-glove service. Request a flight in seconds and be wheels up in hours.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button className="bg-red-600 text-white hover:bg-red-500">
                  Get an Instant Quote <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-950">
                  Explore Fleet
                </Button>
              </div>

              {/* STATS */}
              <div className="mt-10 grid grid-cols-3 gap-6">
                <Stat label="Safety Rating" value="ARGUS Gold+" />
                <Stat label="Avg. Response" value="< 10 min" />
                <Stat label="Trips Managed" value="12,400+" />
              </div>
            </motion.div>

            {/* BOOKING WIDGET */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
              <Card className="bg-zinc-900/70 border-zinc-800 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="text-white">Request a Quote</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><MapPin className="h-4 w-4 text-red-400" /></div>
                        <Input className="pl-9 bg-black border-zinc-800 text-white placeholder:text-zinc-500" placeholder="From (KTEB)" />
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><MapPin className="h-4 w-4 text-red-400" /></div>
                        <Input className="pl-9 bg-black border-zinc-800 text-white placeholder:text-zinc-500" placeholder="To (KAUS)" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Calendar className="h-4 w-4 text-red-400" /></div>
                        <Input type="date" className="pl-9 bg-black border-zinc-800 text-white placeholder:text-zinc-500" />
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Users className="h-4 w-4 text-red-400" /></div>
                        <Input type="number" min={1} max={16} className="pl-9 bg-black border-zinc-800 text-white placeholder:text-zinc-500" placeholder="Passengers" />
                      </div>
                    </div>
                    <Input className="bg-black border-zinc-800 text-white placeholder:text-zinc-500" placeholder="Name" />
                    <Input className="bg-black border-zinc-800 text-white placeholder:text-zinc-500" placeholder="Phone or Email" />
                    <Button type="button" className="mt-2 bg-red-600 text-white hover:bg-red-500">Get Quote</Button>
                    <p className="text-xs text-zinc-500">By submitting you agree to be contacted about this request.</p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUST RIBBON */}
      <section className="border-y border-zinc-900/80 bg-black/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3 text-zinc-300"><ShieldCheck className="h-5 w-5 text-red-500" /> WYVERN/ARGUS Operators</div>
          <div className="flex items-center gap-3 text-zinc-300"><Clock className="h-5 w-5 text-red-500" /> 24/7 Concierge</div>
          <div className="flex items-center gap-3 text-zinc-300"><Phone className="h-5 w-5 text-red-500" /> Dedicated Phone Line</div>
          <div className="flex items-center gap-3 text-zinc-300"><Mail className="h-5 w-5 text-red-500" /> Instant Email Quotes</div>
        </div>
      </section>

      {/* FLEET */}
      <section id="fleet" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Curated Fleet</h2>
          <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-950">See all aircraft</Button>
        </div>
        <p className="mt-3 text-zinc-400 max-w-3xl">Light to long-range jets, vetted for safety and consistency. Below are popular categories for private charters.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FleetCard title="Very Light Jet (VLJ)" range="1,000–1,200 nm" pax="4 seats" images={img.vlj} alt="Very light private jet" seed="vlj" />
          <FleetCard title="Light Jet" range="1,200–1,600 nm" pax="6–7 seats" images={img.light} alt="Light business jet" seed="light" />
          <FleetCard title="Midsize" range="1,800–2,300 nm" pax="7–8 seats" images={img.midsize} alt="Midsize business jet" seed="midsize" />
          <FleetCard title="Super Midsize" range="2,800–3,200 nm" pax="8–9 seats" images={img.super} alt="Super midsize jet" seed="super" />
          <FleetCard title="Heavy Jet" range="3,500–4,000+ nm" pax="10–14 seats" images={img.heavy} alt="Heavy cabin jet" seed="heavy" />
          <FleetCard title="Ultra Long Range" range="6,000–7,700 nm" pax="12–16 seats" images={img.ultra} alt="Ultra long range jet" seed="ultra" />
        </div>
      </section>

      {/* DESTINATIONS */}
      <section id="destinations" className="border-y border-zinc-900/80 bg-black/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Popular City Pairs</h2>
          <p className="mt-3 text-zinc-400">High-frequency routes we service on-demand.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["KTEB → KOPF", "KBUR → KSJC", "KDAL → KAUS", "KLAS → KVNY", "KAPA → KSDL", "EGGW → LFMN"].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-zinc-200">
                <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-red-400" /> {r}</div>
                <Button size="sm" className="bg-red-600 text-white hover:bg-red-500">Quote</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAFETY & REVIEWS */}
      <section id="safety" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Safety First. Always.</h2>
            <p className="mt-3 text-zinc-400 max-w-prose">We partner exclusively with FAA Part 135 operators. Every flight is vetted for crew duty time, weather, and maintenance status. Your dedicated flight desk monitors your trip from request to touchdown.</p>
            <ul className="mt-6 space-y-3 text-zinc-300">
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-red-500" /> ARGUS/WYVERN rated operators</li>
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-red-500" /> Insurance & maintenance verification</li>
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-red-500" /> Real-time flight tracking</li>
            </ul>
          </div>
          <div>
            <div className="grid gap-4">
              {[""].map(() => null)}
              {[1,2,3].map((i) => (
                <Card key={i} className="bg-zinc-900/60 border-zinc-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="text-zinc-300 max-w-prose">
                        "Flawless service and a beautiful aircraft. From inquiry to landing took less than six hours."
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-red-500" />)}
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-zinc-500">— Corporate traveler, NYC ➜ Miami</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="border-y border-zinc-900/80 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-white">Ready to fly?</h3>
            <p className="text-zinc-400">Request a quote and get options in minutes.</p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-red-600 text-white hover:bg-red-500">Get an Instant Quote</Button>
            <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-950">Call 24/7 Desk</Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-600 flex items-center justify-center"><Plane className="h-4 w-4 text-white" /></div>
              <span className="font-semibold tracking-tight text-white">NoAirlines</span>
            </div>
            <p className="mt-4 text-zinc-400 text-sm max-w-xs">Private jet charter and on-demand aviation, delivered with precision.</p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">Company</div>
            <div className="flex flex-col gap-2">
              <FooterLink>About</FooterLink>
              <FooterLink>Careers</FooterLink>
              <FooterLink>Press</FooterLink>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">Legal</div>
            <div className="flex flex-col gap-2">
              <FooterLink>Terms</FooterLink>
              <FooterLink>Privacy</FooterLink>
              <FooterLink>Broker Disclosure</FooterLink>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">Contact</div>
            <div className="flex flex-col gap-2 text-sm text-zinc-400">
              <a className="hover:text-red-400" href="tel:+18005551234">+1 (800) 555‑1234</a>
              <a className="hover:text-red-400" href="mailto:charter@noairlines.com">charter@noairlines.com</a>
              <span className="text-zinc-500">24/7 Flight Desk</span>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-900/80 py-6 text-center text-xs text-zinc-500">
          <p>NoAirlines.com acts as an air charter broker and is not a direct air carrier. All flights are operated by FAA-certificated Part 135 air carriers who exercise full operational control of charter flights at all times.</p>
          <p className="mt-2">© {new Date().getFullYear()} NoAirlines. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

/*
Manual test cases (in addition to runtime asserts):
1) Render the page and verify no console errors; navbar stays sticky on scroll.
2) Verify at least 6 fleet cards render (data-testid="fleet-card").
3) Verify at least 6 fleet images load (data-testid="fleet-image"). If not, check your network console; SmartImage will fall back automatically.
4) Click all primary red CTAs – ensure hover states lighten to red-500.
5) Narrow viewport to <768px – nav collapses, layout stacks correctly.
6) Confirm footer anchors and IDs (#fleet, #destinations, #safety, #contact) in-page navigate.
*/

