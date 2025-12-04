"use client";
import { MapBackground } from "./map-background";
import { PropertyCardsCarousel } from "./property-cards-carousel";

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
  properties: Property[];
  hoveredProperty: string | null;
  onPropertyHover: (id: string | null) => void;
  onPropertyClick: (id: string) => void;
  isAISearch?: boolean;
}

export function MapView({
  properties,
  hoveredProperty,
  onPropertyHover,
  onPropertyClick,
  isAISearch,
}: MapViewProps) {
  return (
    <div className="w-full h-full relative">
      <MapBackground
        Property={properties}
        hoveredProperty={hoveredProperty}
        isAISearch={isAISearch}
      />
      <PropertyCardsCarousel
        properties={properties}
        hoveredProperty={hoveredProperty}
        onPropertyHover={onPropertyHover}
        onPropertyClick={onPropertyClick}
        isAISearch={isAISearch}
      />
    </div>
  );
}
