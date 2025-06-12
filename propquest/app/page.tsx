"use client"

import { useState, useEffect } from "react";
import { TopBar } from "@/components/top-bar"
import { MapControls } from "@/components/map-controls"
import { MapView } from "@/components/map-view"
import { AiChatPanel } from "@/components/ai-chat-panel"

// const properties = [
//   {
//     id: 1,
//     name: "Victor Hugo - Cozy charming studio heart 16e",
//     rating: 5.0,
//     price: 47,
//     image: "/placeholder.svg?height=200&width=300",
//     bestFor: true,
//     location: "SS2, Petaling Jaya",
//     amenities: ["WiFi", "Kitchen", "AC", "Parking"],
//   },
//   {
//     id: 2,
//     name: "GuestReady - Apartment Near Bercy Park",
//     rating: 4.9,
//     price: 73,
//     image: "/placeholder.svg?height=200&width=300",
//     location: "Damansara, Petaling Jaya",
//     amenities: ["WiFi", "Pool", "Gym", "Security"],
//   },
//   {
//     id: 3,
//     name: "Location Petaling Jaya 20",
//     rating: 5.0,
//     price: 63,
//     image: "/placeholder.svg?height=200&width=300",
//     location: "Section 14, Petaling Jaya",
//     amenities: ["WiFi", "Kitchen", "Balcony", "Parking"],
//   },
//   {
//     id: 4,
//     name: "Chic neigh serviced apartment",
//     rating: 5.0,
//     price: 85,
//     image: "/placeholder.svg?height=200&width=300",
//     location: "Section 17, Petaling Jaya",
//     amenities: ["WiFi", "Pool", "Concierge", "Gym"],
//   },
// ]


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


export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
      const fetchProperties = async () => {
        try {
          const res = await fetch("/api/properties");
          if (!res.ok) throw new Error("Failed to fetch properties");
          const data: Property[] = await res.json();
          setProperties(data);
        } catch (error) {
          console.error("Error fetching properties:", error);
        }
      };
  
      fetchProperties();
    }, []);


  const handlePropertyClick = (propertyId: string) => {
    sessionStorage.setItem("propertyDetailReferrer", "/")
  }

  const handleFilterClick = () => {
    console.log("Filter clicked")
  }

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
          />

          <MapView
            properties={properties}
            hoveredProperty={hoveredProperty}
            onPropertyHover={setHoveredProperty}
            onPropertyClick={handlePropertyClick}
          />
        </div>
        
      
        <div className="w-[40%] h-full">
          <AiChatPanel />
        </div>
      </div>
    </div>
  )
}
