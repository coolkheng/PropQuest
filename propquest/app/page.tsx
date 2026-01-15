"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/top-bar";
import { MapControls } from "@/components/map-controls";
import { MapView } from "@/components/map-view";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { useSession } from "@/lib/useSession";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

// Extract location from address
function extractLocation(address: string): string {
  const locations = [
    "Kuala Lumpur",
    "Petaling Jaya",
    "Subang Jaya",
    "Shah Alam",
    "Klang",
    "Seremban",
    "Ampang",
    "Cheras",
    "Puchong",
    "Cyberjaya",
    "Putrajaya",
    "Gombak",
    "Kajang",
    "Bangi",
    "Mont Kiara",
    "Bangsar",
    "Damansara",
    "Kepong",
    "Sentul",
    "Wangsa Maju",
    "Setapak",
  ];

  for (const loc of locations) {
    if (address.toLowerCase().includes(loc.toLowerCase())) {
      return loc;
    }
  }

  const parts = address.split(",");
  return parts[parts.length - 1]?.trim() || "Unknown";
}

// Track property click to sessionStorage
function trackPropertyClick(property: {
  _id: string;
  price: number;
  location: string;
  house_type: string;
  furnishing: string;
  beds: string;
  baths: string;
}): void {
  try {
    const stored = sessionStorage.getItem("userPropertyClicks");
    const clicks = stored ? JSON.parse(stored) : [];

    // Check if this property was already tracked recently (within last 5 seconds)
    const recentlyTracked = clicks.find(
      (click: any) => 
        click._id === property._id && 
        Date.now() - click.timestamp < 5000
    );

    if (recentlyTracked) {
      console.log(`⏭️ Skipped duplicate tracking for ${property._id}`);
      return;
    }

    // Add new click at the beginning (FIFO)
    clicks.unshift({ ...property, timestamp: Date.now() });

    // Keep only the latest 10 clicks
    const trimmedClicks = clicks.slice(0, 10);

    sessionStorage.setItem("userPropertyClicks", JSON.stringify(trimmedClicks));
    console.log(
      `📊 Tracked: ${property.house_type} in ${property.location} (Total: ${trimmedClicks.length}/10)`
    );
  } catch (error) {
    console.error("Failed to track click:", error);
  }
}

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
    const savedGeocodedCache = sessionStorage.getItem("geocodedCache");


    const savedIsAISearch = sessionStorage.getItem("isAISearch");

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
        const res = await axios.get(`${API_URL}/api/properties?limit=100`);
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
    // Find the property from the properties array
    const property = properties.find(p => p._id === propertyId);
    
    if (property) {
      // Track the click
      trackPropertyClick({
        _id: property._id,
        price: property.price,
        location: extractLocation(property.address),
        house_type: property.house_type,
        furnishing: property.furnishing,
        beds: property.beds,
        baths: property.baths,
      });
    }
    
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
