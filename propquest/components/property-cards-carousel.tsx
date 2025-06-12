"use client"

import { MapPropertyCard } from "./map-property-card"

interface Property {
  _id: string;
  url: string;
  title: string;
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  psf: string;
  house_type: string;
  furnishing: string;
  lease_type: string;
  date_listed: string;
  images: string[];
  facilities: string[];
}

interface PropertyCardsCarouselProps {
  properties: Property[]
  hoveredProperty: string | null
  onPropertyHover: (id: string | null) => void
  onPropertyClick: (id: string) => void
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
            key={property._id}
            property={property}
            isHovered={hoveredProperty === property._id}
            onMouseEnter={() => onPropertyHover(property._id)}
            onMouseLeave={() => onPropertyHover(null)}
            onClick={() => onPropertyClick(property._id)}
          />
        ))}
      </div>
    </div>
  )
}
