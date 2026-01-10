"use client";
import { MapBackground } from "./map-background";
import { PropertyCardsCarousel } from "./property-cards-carousel";

interface Property {
  _id: string;
  url: string;
  title: string;
  address: string;
  price: number;
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
  geocodedCache?: Record<string, any>;
  setGeocodedCache?: (cache: Record<string, any>) => void;
}

export function MapView({
  properties,
  hoveredProperty,
  onPropertyHover,
  onPropertyClick,
  isAISearch,
  geocodedCache,
  setGeocodedCache,
}: MapViewProps) {
  return (
    <div className="w-full h-full relative">
      <MapBackground
        Property={properties}
        hoveredProperty={hoveredProperty}
        isAISearch={isAISearch}
        geocodedCache={geocodedCache}
        setGeocodedCache={setGeocodedCache}
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
