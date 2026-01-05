"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { PropertyDetailHeader } from "@/components/property-detail-header";
import { PropertyMainContent } from "@/components/property-main-content";
import { PropertySidebar } from "@/components/property-sidebar";
import { PriceHistory } from "@/components/price-history";

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
  priceHistory?: Array<{
    date: string;
    price: number;
  }>;
}

export default function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [referrer, setReferrer] = useState<string>("/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<Property | null>(null);

  useEffect(() => {
    const storedReferrer = sessionStorage.getItem("propertyDetailReferrer");
    if (storedReferrer) {
      setReferrer(storedReferrer);
      sessionStorage.removeItem("propertyDetailReferrer");
    } else if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const referrerPath = referrerUrl.pathname;
        if (referrerPath.includes("/listing")) {
          setReferrer("/listing");
        } else if (referrerPath === "/" || referrerPath.includes("map")) {
          setReferrer("/");
        }
      } catch (error) {
        setReferrer("/");
      }
    }
  }, []);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const { id } = await params;

        const response = await axios.get(
          `http://localhost:5001/api/properties/${id}`
        );
        setPropertyData(response.data);
      } catch (err) {
        console.error(err);
        setError("Property not found or server error");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [params]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PropertyDetailHeader referrer={referrer} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {propertyData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <PropertyMainContent propertyData={propertyData} />
              <PropertySidebar propertyData={propertyData} />
            </div>

            <div className="mt-8">
              <PriceHistory
                priceHistory={propertyData?.priceHistory || []}
                currentPrice={propertyData?.price}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
