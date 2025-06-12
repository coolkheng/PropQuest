"use client"
import { MapBackground } from "./map-background"
import { PropertyCardsCarousel } from "./property-cards-carousel"

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


interface MapViewProps {
  properties: Property[]
  hoveredProperty: string | null
  onPropertyHover: (id: string | null) => void
  onPropertyClick: (id: string) => void
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
