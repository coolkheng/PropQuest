"use client"

import { MapPropertyCard } from "./map-property-card"

interface Property {
  id: number
  name: string
  rating: number
  price: number
  image: string
  bestFor?: boolean
}

interface PropertyCardsCarouselProps {
  properties: Property[]
  hoveredProperty: number | null
  onPropertyHover: (id: number | null) => void
  onPropertyClick: (id: number) => void
}

export function PropertyCardsCarousel({
  properties,
  hoveredProperty,
  onPropertyHover,
  onPropertyClick,
}: PropertyCardsCarouselProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4">
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {properties.map((property) => (
          <MapPropertyCard
            key={property.id}
            property={property}
            isHovered={hoveredProperty === property.id}
            onMouseEnter={() => onPropertyHover(property.id)}
            onMouseLeave={() => onPropertyHover(null)}
            onClick={() => onPropertyClick(property.id)}
          />
        ))}
      </div>
    </div>
  )
}
