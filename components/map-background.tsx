import { PropertyMarker } from "@/components/property-marker"

interface MapBackgroundProps {
  hoveredProperty: number | null
}

export function MapBackground({ hoveredProperty }: MapBackgroundProps) {
  const markerPositions = ["top-1/3 left-1/2", "top-1/2 left-1/3", "bottom-1/3 left-2/3", "top-2/3 right-1/4"]
  const markerPrices = [359, 563, 447, 365]

  return (
    <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 relative overflow-hidden">
      {/* Simulated Map of Petaling Jaya */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/3 w-32 h-24 bg-green-200 rounded-lg"></div>
        <div className="absolute top-1/2 left-1/4 w-40 h-32 bg-blue-200 rounded-lg"></div>
        <div className="absolute bottom-1/3 right-1/3 w-36 h-28 bg-green-300 rounded-lg"></div>
      </div>

      {/* Location Labels */}
      <div className="absolute top-1/4 left-1/4 text-sm font-medium text-gray-700">SS2</div>
      <div className="absolute top-1/2 left-1/2 text-lg font-bold text-gray-800">Petaling Jaya</div>
      <div className="absolute bottom-1/3 right-1/4 text-sm font-medium text-gray-700">Damansara</div>

      {/* Property Markers */}
      {markerPositions.map((position, index) => (
        <PropertyMarker
          key={index}
          price={markerPrices[index]}
          isHovered={hoveredProperty === index + 1}
          position={position}
        />
      ))}
    </div>
  )
}
