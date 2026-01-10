import { MapPin } from "lucide-react"

interface PropertyMarkerProps {
  price: number
  isHovered: boolean
  position: string
}

export function PropertyMarker({ price, isHovered, position }: PropertyMarkerProps) {
  return (
    <div className={`absolute ${position} transform -translate-x-1/2 -translate-y-1/2`}>
      <div
        className={`bg-white rounded-full px-3 py-1 shadow-lg border-2 ${
          isHovered ? "border-blue-500 scale-125" : "border-blue-gradient"
        } text-sm font-semibold transition-all duration-200`}
      >
        <MapPin className={`inline h-4 w-4 mr-1 ${isHovered ? "text-blue-500" : "text-blue-500"}`} />
        RM{price}
      </div>
    </div>
  )
}
