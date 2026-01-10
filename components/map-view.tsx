"use client"
import { MapBackground } from "./map-background"
import { PropertyCardsCarousel } from "./property-cards-carousel"

interface Property {
  id: number
  name: string
  rating: number
  price: number
  image: string
  bestFor?: boolean
}

interface MapViewProps {
  properties: Property[]
  hoveredProperty: number | null
  onPropertyHover: (id: number | null) => void
  onPropertyClick: (id: number) => void
}

export function MapView({ properties, hoveredProperty, onPropertyHover, onPropertyClick }: MapViewProps) {
  return (
    <div className="w-full h-full relative">
      <MapBackground hoveredProperty={hoveredProperty} />
      <PropertyCardsCarousel
        properties={properties}
        hoveredProperty={hoveredProperty}
        onPropertyHover={onPropertyHover}
        onPropertyClick={onPropertyClick}
      />
    </div>
  )
}
