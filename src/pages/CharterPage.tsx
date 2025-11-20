import { useEffect } from "react"
import Layout from "@/components/Layout"

export default function CharterPage() {
  useEffect(() => {
    // Load Tuvoli widget script
    const scriptId = "tuvoli-iframe-script"
    
    // Check if script already exists
    if (document.getElementById(scriptId)) {
      return
    }

    const script = document.createElement("script")
    script.id = scriptId
    script.defer = true
    script.src = "https://widgets-ecs.tuvoli.com/assets/js/loader.js"
    script.setAttribute("data-guid", "53513817-53b7-4b01-b5c9-156f0d693ac9")
    script.setAttribute("data-height", "800")
    script.setAttribute("data-type", "itinerary")
    
    document.body.appendChild(script)

    // Cleanup function
    return () => {
      const existingScript = document.getElementById(scriptId)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          <div id="tuvoli-iframe-wrapper" className="w-full"></div>
        </div>
      </div>
    </Layout>
  )
}

