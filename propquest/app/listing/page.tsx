"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { FloatingSearchBar } from "@/components/floating-search-bar";
import { ListingControls } from "@/components/listing-controls";
import { ListingHeader } from "@/components/listing-header";
import { PropertyGrid } from "@/components/property-grid";
import { FiltersModal, Filters } from "@/components/filters-modal";
import { SortOption } from "@/components/sort-button";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(60);
  const router = useRouter();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // Backend now uses PORT from env or 5001 by default to avoid conflicts on macOS.
        const res = await axios.get<Property[]>(
          "http://localhost:5001/api/properties"
        );
        const data: Property[] = res.data;
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
    setShowFilters(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortOption]);

  // Count active filters
  const activeFilterCount = filters
    ? Object.entries(filters).filter(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === "string" && value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      }).length
    : 0;

  // derive the displayed properties based on searchQuery and filters
  const filteredAndSortedProperties = properties
    .filter((p) => {
      // basic free-text search from the floating search bar
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const hay = [p.title, p.address, p.house_type]
          .concat(p.facilities || [])
          .join(" ")
          .toLowerCase();
        if (!q.split(" ").every((tok) => hay.includes(tok))) return false;
      }

      // apply filters if present
      if (filters) {
        // property type - now supports multiple types
        if (filters.propertyType && filters.propertyType.length > 0) {
          const matchesType = filters.propertyType.some((type) =>
            p.house_type.toLowerCase().includes(type.toLowerCase())
          );
          if (!matchesType) return false;
        }
        // min size (p.sqft might be string, try to parse numbers)
        if (filters.minSize != null) {
          const sqft = Number((p.sqft || "").replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(sqft) || sqft < (filters.minSize || 0))
            return false;
        }
        // rooms / toilets (p.beds/p.baths or beds,baths strings)
        if (filters.rooms != null) {
          const beds = Number((p.beds || "").replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(beds) || beds < filters.rooms) return false;
        }
        if (filters.toilets != null) {
          const baths = Number((p.baths || "").replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(baths) || baths < filters.toilets) return false;
        }
        // price range
        if (filters.minPrice != null || filters.maxPrice != null) {
          const price = Number((p.price || "").replace(/[^0-9.]/g, ""));
          if (
            filters.minPrice != null &&
            (!Number.isFinite(price) || price < filters.minPrice)
          )
            return false;
          if (
            filters.maxPrice != null &&
            (!Number.isFinite(price) || price > filters.maxPrice)
          )
            return false;
        }
        // keywords
        if (filters.keywords && filters.keywords.length > 0) {
          const hay = [p.title, p.address, p.house_type]
            .concat(p.facilities || [])
            .join(" ")
            .toLowerCase();
          if (!filters.keywords.every((k) => hay.includes(k.toLowerCase())))
            return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Apply sorting if a sort option is selected
      if (!sortOption) return 0;

      switch (sortOption.value) {
        case "price": {
          const priceA = Number((a.price || "").replace(/[^0-9.]/g, ""));
          const priceB = Number((b.price || "").replace(/[^0-9.]/g, ""));
          return sortOption.direction === "asc"
            ? priceA - priceB
            : priceB - priceA;
        }
        case "area": {
          const areaA = Number((a.sqft || "").replace(/[^0-9.]/g, ""));
          const areaB = Number((b.sqft || "").replace(/[^0-9.]/g, ""));
          return sortOption.direction === "asc" ? areaA - areaB : areaB - areaA;
        }
        case "name": {
          const nameA = a.title.toLowerCase();
          const nameB = b.title.toLowerCase();
          return sortOption.direction === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        default:
          return 0;
      }
    });

  // Calculate pagination
  const totalResults = filteredAndSortedProperties.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedProperties = filteredAndSortedProperties.slice(
    startIndex,
    endIndex
  );

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
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              className=""
              onIconClick={() => setShowFilters(true)}
              onInputClick={() => setShowFilters(true)}
              isExpanded={showFilters}
            />
            <FiltersModal
              open={showFilters}
              onClose={() => setShowFilters(false)}
              onApply={(f) => setFilters(f)}
              onClear={() => {
                setSearchQuery("");
                setFilters(null);
              }}
              initial={filters ?? undefined}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pt-24">
        <ListingControls
          onFilterClick={handleFilterClick}
          filterCount={activeFilterCount}
          onSortChange={setSortOption}
        />
        <ListingHeader
          title="Properties in Petaling Jaya"
          resultCount={totalResults}
        />
        <PropertyGrid
          properties={displayedProperties}
          onPropertyClick={(id) => handlePropertyClick(id)}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-6">
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
                      variant={currentPage === page ? "default" : "outline"}
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
          </div>
        )}

        {/* Results Info */}
        {displayedProperties.length > 0 && (
          <div className="text-center py-4 text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, totalResults)} of{" "}
            {totalResults} propert
            {totalResults === 1 ? "y" : "ies"}
          </div>
        )}
      </div>
    </div>
  );
}
