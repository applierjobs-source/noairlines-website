import { useParams } from "react-router-dom"
import { getRouteBySlug } from "@/routes/routeData"
import RouteLandingPage from "@/components/RouteLandingPage"

export default function RoutePage() {
  const { slug } = useParams<{ slug: string }>()
  const route = slug ? getRouteBySlug(slug) : undefined

  if (!route) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Route Not Found</h1>
          <p className="text-zinc-600">The route you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return <RouteLandingPage route={route} />
}

