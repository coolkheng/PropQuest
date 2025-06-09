"use client"

import { ListPropertyCard } from "./list-property-card"

interface Property {
  id: number
  name: string
  rating: number
  price: number
  image: string
  location: string
  amenities: string[]
  bestFor?: boolean
}

interface PropertyGridProps {
  properties: Property[]
  onPropertyClick: (id: number) => void
}

export function PropertyGrid({ properties, onPropertyClick }: PropertyGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <ListPropertyCard
          key={property.id}
          property={property}
          isHovered={false}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          onClick={() => onPropertyClick(property.id)}
        />
      ))}
    </div>
  )
}
