"use client";

import { MapPropertyCard } from "./map-property-card";
import { mapPropertyLimit } from "@/lib/map-limits";

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

interface PropertyCardsCarouselProps {
  properties: Property[];
  hoveredProperty: string | null;
  onPropertyHover: (id: string | null) => void;
  onPropertyClick: (id: string) => void;
  isAISearch?: boolean;

}

export function PropertyCardsCarousel({
  properties,
  hoveredProperty,
  onPropertyHover,
  onPropertyClick,
  isAISearch = false,
}: PropertyCardsCarouselProps) {
  // Same cap as the map, so every card has a matching pin
  const displayProperties = properties.slice(0, mapPropertyLimit(isAISearch));

  return (
    <div className="absolute bottom-4 left-4 right-4">
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {displayProperties.map((property) => (
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
  );
}
