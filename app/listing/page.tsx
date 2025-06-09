"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { FloatingSearchBar } from "@/components/floating-search-bar";
import { ListingControls } from "@/components/listing-controls";
import { ListingHeader } from "@/components/listing-header";
import { PropertyGrid } from "@/components/property-grid";
import { LoadMoreSection } from "@/components/load-more-section";

// ✅ Locally define the Property interface
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

export default function ListingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
    sessionStorage.setItem("propertyDetailReferrer", "/listing");
    router.push(`/property/${propertyId}`);
  };

  const handleFilterClick = () => {
    console.log("Filter clicked");
  };

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

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
        <ListingHeader
          title="Properties in Petaling Jaya"
          resultCount={properties.length}
        />
        <PropertyGrid
          properties={properties}
          onPropertyClick={(id) => handlePropertyClick(id)}
        />
        <LoadMoreSection onLoadMore={handleLoadMore} isLoading={isLoading} />
      </div>
    </div>
  );
}
