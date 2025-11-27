"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { ListingControls } from "@/components/listing-controls";
import { ListingHeader } from "@/components/listing-header";
import { PropertyGrid } from "@/components/property-grid";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/useSession";
import axios from "axios";

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
  score?: number;
}

export default function ForYouPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(60);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!sessionLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchPersonalizedProperties = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        const res = await axios.get(
          `http://localhost:5001/api/properties/personalized?${params.toString()}`,
          { withCredentials: true }
        );

        console.log("Personalized API Response:", res.data);
        setProperties(res.data.properties || []);
        setTotalPages(res.data.pagination.totalPages || 0);
        setTotalResults(res.data.pagination.totalCount || 0);
      } catch (error) {
        console.error("Error fetching personalized properties:", error);
        setProperties([]);
        setTotalPages(0);
        setTotalResults(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalizedProperties();
  }, [currentPage, user, sessionLoading, router, itemsPerPage]);

  const handlePropertyClick = (propertyId: string) => {
    sessionStorage.setItem("propertyDetailReferrer", "/foryou");
    router.push(`/property/${propertyId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const displayedProperties = properties;

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      <div className="max-w-7xl mx-auto px-4 py-6 pt-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <Link href="/">
              <Button className="px-6 py-2 rounded-full shadow-lg bg-white/90 hover:bg-white backdrop-blur-sm text-black">
                Map
              </Button>
            </Link>
            <Link href="/foryou">
              <Button className="px-6 py-2 rounded-full shadow-lg bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0 text-black">
                For You
              </Button>
            </Link>
            <Link href="/listing">
              <Button
                variant="outline"
                className="px-6 py-2 rounded-full shadow-lg bg-white/90 hover:bg-white backdrop-blur-sm text-black"
              >
                List
              </Button>
            </Link>
          </div>
        </div>
        <ListingHeader
          title="For You - Personalized Recommendations"
          resultCount={totalResults}
        />

        {isLoading && properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">
              Loading your personalized recommendations...
            </p>
          </div>
        ) : displayedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Set Your Preferences
              </h3>
              <p className="text-gray-600 mb-6">
                To see personalized recommendations, please set your property
                preferences first.
              </p>
              <Button
                onClick={() => router.push("/preferences")}
                className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
              >
                Go to Preferences
              </Button>
            </div>
          </div>
        ) : (
          <>
            <PropertyGrid
              properties={displayedProperties}
              onPropertyClick={handlePropertyClick}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-8 mb-12">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {getPageNumbers().map((page, index) => (
                    <div key={index}>
                      {page === "..." ? (
                        <span className="px-3 py-2 text-gray-400">...</span>
                      ) : (
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => handlePageChange(page as number)}
                          className={
                            currentPage === page
                              ? "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
                              : ""
                          }
                        >
                          {page}
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Results Info */}
            {displayedProperties.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalResults)} of{" "}
                {totalResults} personalized recommendations
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
