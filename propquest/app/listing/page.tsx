"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { FloatingSearchBar } from "@/components/floating-search-bar";
import { ListingControls } from "@/components/listing-controls";
import { ListingHeader } from "@/components/listing-header";
import { PropertyGrid } from "@/components/property-grid";
import { FiltersModal, Filters } from "@/components/filters-modal";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
import { SortOption } from "@/components/sort-button";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/useSession";
import axios from "axios";

// Aggregate user preferences from sessionStorage
function aggregatePreferences() {
  try {
    const stored = sessionStorage.getItem('userPropertyClicks');
    if (!stored) return null;
    
    const clicks = JSON.parse(stored);
    if (clicks.length < 3) {
      console.log(`⏳ Need ${3 - clicks.length} more clicks for preferences`);
      return null;
    }

    const prices = clicks.map((c: any) => c.price);
    const avg_price = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length);

    const locationCounts = new Map<string, number>();
    clicks.forEach((click: any) => {
      locationCounts.set(click.location, (locationCounts.get(click.location) || 0) + 1);
    });
    const dominant_location = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    const typeCounts = new Map<string, number>();
    clicks.forEach((click: any) => {
      typeCounts.set(click.house_type, (typeCounts.get(click.house_type) || 0) + 1);
    });
    const dominant_type = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    const furnishingCounts = new Map<string, number>();
    clicks.forEach((click: any) => {
      furnishingCounts.set(click.furnishing, (furnishingCounts.get(click.furnishing) || 0) + 1);
    });
    const furnishing_preference = Array.from(furnishingCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    const beds = clicks.map((c: any) => parseFloat(c.beds) || 0).filter((b: number) => b > 0);
    const avg_beds = beds.length > 0 
      ? Math.round(beds.reduce((a: number, b: number) => a + b, 0) / beds.length) 
      : 0;

    const preferences = {
      avg_price,
      price_range: { 
        min: Math.floor(Math.min(...prices) * 0.8), 
        max: Math.ceil(Math.max(...prices) * 1.2) 
      },
      dominant_location,
      dominant_type,
      furnishing_preference,
      avg_beds,
      click_count: clicks.length,
    };

    console.log("📈 User Preferences:", preferences);
    return preferences;
  } catch (error) {
    console.error("Error aggregating preferences:", error);
    return null;
  }
}

// ✅ Locally define the Property interface
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

export default function ListingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [pendingSearch, setPendingSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(60);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const router = useRouter();
  const { user } = useSession();

  // Sync pendingSearch with filters.location when filters change
  useEffect(() => {
    if (filters?.location) {
      setPendingSearch(filters.location);
    }
  }, [filters?.location]);

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      
      // Step 1: Get user session preferences from sessionStorage (only on page 1)
      let userPreferences = null;
      if (currentPage === 1) {
        userPreferences = aggregatePreferences();
        if (userPreferences) {
          console.log("📊 User preferences detected:", userPreferences);
        }
      }
      
      try {
        // Build query parameters for server-side filtering and sorting
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        // Add filters
        if (filters) {
          if (filters.location) {
            params.append("location", filters.location);
          }
          if (filters.propertyType && filters.propertyType.length > 0) {
            params.append("propertyType", filters.propertyType.join(","));
          }
          if (filters.minPrice != null) {
            params.append("minPrice", filters.minPrice.toString());
          }
          if (filters.maxPrice != null) {
            params.append("maxPrice", filters.maxPrice.toString());
          }
          if (filters.rooms != null) {
            params.append("rooms", filters.rooms.toString());
          }
          if (filters.toilets != null) {
            params.append("toilets", filters.toilets.toString());
          }
          if (filters.minSize != null) {
            params.append("minSize", filters.minSize.toString());
          }
        }

        // Add sorting
        if (sortOption) {
          params.append("sortBy", sortOption.value);
          params.append("sortDirection", sortOption.direction);
        }

        const res = await axios.get(
          `${API_URL}/api/properties?${params.toString()}`
        );

        setProperties(res.data.properties || []);
        setTotalPages(res.data.pagination?.totalPages || 0);
        setTotalResults(res.data.pagination?.totalCount || 0);
      } catch (error) {
        console.error("Error fetching properties:", error);
        setProperties([]);
        setTotalPages(0);
        setTotalResults(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [currentPage, filters, sortOption, itemsPerPage]);

  const handlePropertyClick = (propertyId: string) => {
    sessionStorage.setItem("propertyDetailReferrer", "/listing");
    router.push(`/property/${propertyId}`);
  };

  const handleSearch = () => {
    // When search is triggered, open filters with location pre-filled
    if (pendingSearch.trim()) {
      setFilters((prev) => ({
        ...prev,
        location: pendingSearch.trim(),
      }));
    }
    setShowFilters(true);
  };

  const handleFilterClick = () => {
    setShowFilters(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOption]);

  // Count active filters
  const activeFilterCount = filters
    ? Object.entries(filters).filter(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === "string" && value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      }).length
    : 0;

  // Properties are already filtered and sorted by the server
  const displayedProperties = properties;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      <div className="relative">
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4">
          <div
            className={`transition-all duration-300 ease-out ${
              showFilters ? "shadow-lg" : ""
            }`}
          >
            <FloatingSearchBar
              searchQuery={pendingSearch}
              onSearchChange={setPendingSearch}
              className=""
              onIconClick={() => setShowFilters(false)}
              onInputClick={() => setShowFilters(true)}
              onSearch={handleSearch}
              isExpanded={showFilters}
            />
            <FiltersModal
              open={showFilters}
              onClose={() => setShowFilters(false)}
              onApply={(f) => {
                setFilters(f);
                setShowFilters(false);
              }}
              onClear={() => {
                setPendingSearch("");
                setFilters(null);
              }}
              initial={filters ?? undefined}
              locationValue={pendingSearch}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pt-24">
        <ListingControls
          onFilterClick={handleFilterClick}
          filterCount={activeFilterCount}
          onSortChange={setSortOption}
          isLoggedIn={!!user}
        />
        <ListingHeader
          title="Properties in Petaling Jaya"
          resultCount={totalResults}
        />

        {isLoading && properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading properties...</p>
          </div>
        ) : (
          <>
            <PropertyGrid
              properties={displayedProperties}
              onPropertyClick={(id) => handlePropertyClick(id)}
            />

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-2 mt-8 mb-6">
              {totalPages > 1 ? (
                <>
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <div key={index}>
                        {page === "..." ? (
                          <span className="px-3 py-2 text-gray-400">...</span>
                        ) : (
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-2 min-w-[40px] ${
                              currentPage === page
                                ? "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white"
                                : ""
                            }`}
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Next Button */}
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                /* Single page indicator */
                <div className="px-3 py-2">
                  <Button
                    variant="default"
                    className="px-3 py-2 min-w-[40px] bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white cursor-default"
                  >
                    1
                  </Button>
                </div>
              )}
            </div>

            {/* Results Info */}
            {displayedProperties.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalResults)} of{" "}
                {totalResults} propert
                {totalResults === 1 ? "y" : "ies"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
