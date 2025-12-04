"use client";

import { useState, useEffect } from "react";
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
}

const priceHistory = [
      { date: "Jan 2024", price: 1800 },
      { date: "Feb 2024", price: 1850 },
      { date: "Mar 2024", price: 1900 },
      { date: "Apr 2024", price: 1950 },
      { date: "May 2024", price: 2000 },
      { date: "Jun 2024", price: 2050 },
      { date: "Jul 2024", price: 2100 },
    ]

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

        const res = await fetch(`http://localhost:5001/api/properties/${id}`);
        if (!res.ok) throw new Error("Failed to fetch property data");
        const data = await res.json();
        setPropertyData(data);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <PropertyMainContent propertyData={propertyData} />
            <PropertySidebar propertyData={propertyData} />
          </div>
        )}

          <div className="mt-8">
          {priceHistory && priceHistory.length > 0 && (
        <PriceHistory priceHistory={priceHistory} />
      )}
      </div>
       
      </div>

    </div>
  );
}
