"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { PropertyDetailHeader } from "@/components/property-detail-header";
import { PropertyMainContent } from "@/components/property-main-content";
import { PropertySidebar } from "@/components/property-sidebar";
import { PriceHistory } from "@/components/price-history";

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
        click._id === property._id && Date.now() - click.timestamp < 5000,
    );

    if (recentlyTracked) {
      return;
    }

    // Add new click at the beginning (FIFO)
    clicks.unshift({ ...property, timestamp: Date.now() });

    // Keep only the latest 10 clicks
    const trimmedClicks = clicks.slice(0, 10);

    sessionStorage.setItem("userPropertyClicks", JSON.stringify(trimmedClicks));
  } catch (error) {
    console.error("Failed to track click:", error);
  }
}

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
  priceHistory?: Array<{
    date: string;
    price: number;
  }>;
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [referrer, setReferrer] = useState<string>("/");
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
        const { id } = await params;

        const response = await axios.get(`${API_URL}/api/properties/${id}`);
        setPropertyData(response.data);

        // Track property click for preference learning
        trackPropertyClick({
          _id: response.data._id,
          price: response.data.price,
          location: extractLocation(response.data.address),
          house_type: response.data.house_type,
          furnishing: response.data.furnishing,
          beds: response.data.beds,
          baths: response.data.baths,
        });
      } catch {
        console.error("Property not found or server error");
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
                beds={propertyData?.beds}
                sqft={propertyData?.sqft}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
