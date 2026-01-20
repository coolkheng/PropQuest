"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { PropertyDetailHeader } from "@/components/property-detail-header";
import { PropertyMainContent } from "@/components/property-main-content";
import { PropertySidebar } from "@/components/property-sidebar";
import { PriceHistory } from "@/components/price-history";
import { WhatsNearby } from "@/components/whats-nearby";

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

const amenities = {
  publicTransport: [
    "LRT SS2 Station (0.3km)",
    "Bus Stop (0.1km)",
    "Grab/Taxi Available",
  ],
  schools: [
    "SJK(C) Chee Wen (0.5km)",
    "SMK SS2 (0.8km)",
    "Tadika Kanak-Kanak (0.2km)",
  ],
  universities: [
    "University of Malaya (5.2km)",
    "Sunway University (8.1km)",
    "Taylor's University (6.3km)",
  ],
  medical: [
    "SS2 Clinic (0.3km)",
    "Assunta Hospital (2.1km)",
    "University Malaya Medical Centre (4.8km)",
  ],
  shopping: [
    "SS2 Mall (0.4km)",
    "Paradigm Mall (3.2km)",
    "1 Utama (7.5km)",
    "The Curve (6.8km)",
  ],
  highways: [
    "Federal Highway (1.2km)",
    "LDP (2.1km)",
    "NPE (3.5km)",
    "SPRINT (4.2km)",
  ],
  foodAndDrink: [
    { name: "Rich Kopitiam Elmina", time: "3 mins", distance: "240 m" },
    { name: "Sushi Zanmai Elmina", time: "6 mins", distance: "520 m" },
    { name: "Mee Hiris China Elmina", time: "6 mins", distance: "530 m" },
    { name: "Burger King - Elmina", time: "6 mins", distance: "540 m" },
    { name: "Ole-Ole Bali, Elmina", time: "7 mins", distance: "560 m" },
    { name: "Chica Bonita @ Elmina", time: "7 mins", distance: "560 m" },
    { name: "Kenny Hills Bakery Elmina", time: "7 mins", distance: "590 m" },
    { name: "Nyonya Colors Elmina", time: "7 mins", distance: "590 m" },
    { name: "NakNak 낙낙 Elmina", time: "7 mins", distance: "590 m" },
    { name: "Subway Elmina Lifestyle", time: "7 mins", distance: "600 m" },
  ],
};

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
              <WhatsNearby
                address={propertyData?.address}
                amenities={amenities}
              />
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
