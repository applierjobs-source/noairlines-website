import { Plane } from "lucide-react"
import { ReactNode } from "react"
import { Link } from "react-router-dom"
import { routes } from "@/routes/routeData"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer with Legal Text */}
      <footer className="border-t border-zinc-300 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6">
          {/* Popular Routes */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-black mb-3 text-center">Popular Routes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {routes.map((route) => (
                <Link
                  key={route.id}
                  to={`/routes/${route.slug}`}
                  className="text-zinc-600 hover:text-blue-600 transition-colors text-center"
                >
                  {route.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="text-center text-xs text-zinc-600 border-t border-zinc-200 pt-6">
            <p>
              NoAirlines.com acts as an air charter broker and is not a direct air carrier. All
              flights are operated by FAA-certificated Part 135 air carriers who exercise full
              operational control of charter flights at all times.
            </p>
            <p className="mt-2">© {new Date().getFullYear()} NoAirlines. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

