"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { ListingHeader } from "@/components/listing-header";
import { PropertyGrid } from "@/components/property-grid";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
import { useSession } from "@/lib/useSession";
import axios from "axios";

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
  score?: number;
}

export default function ForYouPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
      return;
    }
  }, [user, sessionLoading, router]);

  // Fetch properties (backend handles personalized vs default ranking)
  useEffect(() => {
    if (!user) return;

    const fetchProperties = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        const res = await axios.get(
          `${API_URL}/api/properties/personalized?${params.toString()}`,
          { withCredentials: true }
        );

        console.log("Properties API Response:", res.data);
        setProperties(res.data.properties || []);
        setIsPersonalized(res.data.isPersonalized !== false);
        setTotalPages(res.data.pagination.totalPages || 0);
        setTotalResults(res.data.pagination.totalCount || 0);
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
  }, [currentPage, user, itemsPerPage]);

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
            <p className="mt-4 text-gray-600">Loading properties...</p>
          </div>
        ) : displayedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Properties Found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any properties matching your preferences. Try
                adjusting your filters.
              </p>
              <Button
                onClick={() => router.push("/preferences")}
                className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
              >
                Update Preferences
              </Button>
            </div>
          </div>
        ) : (
          <>
            {!isPersonalized && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xl">💡</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Get Personalized Recommendations
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Set your preferences to see properties ranked specifically
                      for you. For now, showing the 50 newest listings:
                    </p>
                    <Button
                      onClick={() => router.push("/preferences")}
                      className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
                    >
                      Set Your Preferences
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
