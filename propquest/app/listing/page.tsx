"use client"

import { useState } from "react"
import { TopBar } from "@/components/top-bar"
import { FloatingSearchBar } from "@/components/floating-search-bar"
import { ListingControls } from "@/components/listing-controls"
import { ListingHeader } from "@/components/listing-header"
import { PropertyGrid } from "@/components/property-grid"
import { LoadMoreSection } from "@/components/load-more-section"

const properties = [
  {
    id: 1,
    name: "Victor Hugo - Cozy charming studio heart 16e",
    rating: 5.0,
    price: 47,
    image: "/placeholder.svg?height=200&width=300",
    location: "SS2, Petaling Jaya",
    amenities: ["WiFi", "Kitchen", "AC", "Parking"],
  },
  {
    id: 2,
    name: "GuestReady - Apartment Near Bercy Park",
    rating: 4.9,
    price: 73,
    image: "/placeholder.svg?height=200&width=300",
    location: "Damansara, Petaling Jaya",
    amenities: ["WiFi", "Pool", "Gym", "Security"],
  },
  {
    id: 3,
    name: "Location Petaling Jaya 20",
    rating: 5.0,
    price: 63,
    image: "/placeholder.svg?height=200&width=300",
    location: "Section 14, Petaling Jaya",
    amenities: ["WiFi", "Kitchen", "Balcony", "Parking"],
  },
  {
    id: 4,
    name: "Chic neigh serviced apartment",
    rating: 5.0,
    price: 85,
    image: "/placeholder.svg?height=200&width=300",
    location: "Section 17, Petaling Jaya",
    amenities: ["WiFi", "Pool", "Concierge", "Gym"],
  },
  {
    id: 5,
    name: "Modern Studio in PJ Central",
    rating: 4.8,
    price: 55,
    image: "/placeholder.svg?height=200&width=300",
    location: "PJ Central, Petaling Jaya",
    amenities: ["WiFi", "Kitchen", "AC", "Near LRT"],
  },
  {
    id: 6,
    name: "Luxury Condo with City View",
    rating: 4.7,
    price: 95,
    image: "/placeholder.svg?height=200&width=300",
    location: "Section 13, Petaling Jaya",
    amenities: ["WiFi", "Pool", "Gym", "City View"],
  },
]

export default function ListingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handlePropertyClick = (propertyId: number) => {
    sessionStorage.setItem("propertyDetailReferrer", "/listing")
  }

  const handleFilterClick = () => {
    console.log("Filter clicked")
  }

  const handleLoadMore = () => {
    setIsLoading(true)
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      {/* Floating Search Bar */}
      <div className="relative">
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4">
          <FloatingSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-white/20"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pt-24">
        <ListingControls onFilterClick={handleFilterClick} />
        <ListingHeader title="Properties in Petaling Jaya" resultCount={46} />
        <PropertyGrid properties={properties} onPropertyClick={handlePropertyClick} />
        <LoadMoreSection onLoadMore={handleLoadMore} isLoading={isLoading} />
      </div>
    </div>
  )
}
