import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ViewToggleProps {
  activeView: "map" | "list"
  mapHref?: string
  listHref?: string
}

export function ViewToggle({ activeView, mapHref = "/", listHref = "/listing" }: ViewToggleProps) {
  const buttonClass = "px-6 py-2 rounded-full shadow-lg"
  const activeMapClass = "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0"
  const activeListClass = "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0 text-black"
  const inactiveClass = "bg-white/90 hover:bg-white backdrop-blur-sm text-black"

  return (
    <div className="flex space-x-2">
      <Link href={mapHref}>
        <Button className={`${buttonClass} ${activeView === "map" ? activeMapClass : inactiveClass}`}>
          <span className={activeView === "map" ? "text-black" : ""}>Map</span>
        </Button>
      </Link>
      <Link href={listHref}>
        <Button
          variant="outline"
          className={`${buttonClass} ${activeView === "list" ? activeListClass : inactiveClass}`}
        >
          List
        </Button>
      </Link>
    </div>
  )
}
