"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/top-bar";
import { MapControls } from "@/components/map-controls";
import { MapView } from "@/components/map-view";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { useSession } from "@/lib/useSession";
import axios from "axios";

export interface Property {
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

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]); // Lifted state
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [isAISearch, setIsAISearch] = useState<boolean>(false);
  const [geocodedCache, setGeocodedCache] = useState<Record<string, any>>({});
  const { user } = useSession();

  // Restore search state from sessionStorage on mount
  useEffect(() => {
    const savedProperties = sessionStorage.getItem("searchProperties");
    const savedIsAISearch = sessionStorage.getItem("isAISearch");
    const savedGeocodedCache = sessionStorage.getItem("geocodedCache");

    if (savedProperties && savedIsAISearch) {
      try {
        const parsedProperties = JSON.parse(savedProperties);
        const parsedIsAISearch = JSON.parse(savedIsAISearch);
        setProperties(parsedProperties);
        setIsAISearch(parsedIsAISearch);

        // Restore geocoded cache
        if (savedGeocodedCache) {
          const parsedCache = JSON.parse(savedGeocodedCache);
          setGeocodedCache(parsedCache);
          console.log(
            "✅ Restored geocoded cache:",
            Object.keys(parsedCache).length,
            "locations"
          );
        }

        console.log(
          "✅ Restored search state:",
          parsedProperties.length,
          "properties"
        );
        return; // Skip default fetch
      } catch (error) {
        console.error("Error restoring search state:", error);
      }
    }

    // Only fetch default properties if no saved search state
    const fetchProperties = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5001/api/properties?limit=100"
        );
        // Handle new API response format
        const data = res.data.properties || res.data;
        setProperties(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };

    fetchProperties();
  }, []);

  // Save search state to sessionStorage whenever properties or isAISearch changes
  useEffect(() => {
    if (properties.length > 0) {
      sessionStorage.setItem("searchProperties", JSON.stringify(properties));
      sessionStorage.setItem("isAISearch", JSON.stringify(isAISearch));

      // Save geocoded cache
      if (Object.keys(geocodedCache).length > 0) {
        sessionStorage.setItem("geocodedCache", JSON.stringify(geocodedCache));
      }
    }
  }, [properties, isAISearch, geocodedCache]);

  const handlePropertyClick = (propertyId: string) => {
    sessionStorage.setItem("propertyDetailReferrer", "/");
  };

  const handleFilterClick = () => {
    console.log("Filter clicked");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      <div className="flex flex-1 h-[calc(100vh-80px)]">
        <div className="w-[60%] relative h-full">
          <MapControls
            activeView="map"
            onFilterClick={handleFilterClick}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoggedIn={!!user}
          />

          <MapView
            properties={properties}
            hoveredProperty={hoveredProperty}
            onPropertyHover={setHoveredProperty}
            onPropertyClick={handlePropertyClick}
            isAISearch={isAISearch}
            geocodedCache={geocodedCache}
            setGeocodedCache={setGeocodedCache}
          />
        </div>

        <div className="w-[40%] h-full">
          <AiChatPanel
            properties={properties}
            setProperties={setProperties}
            setIsAISearch={setIsAISearch}
          />
        </div>
      </div>
    </div>
  );
}
