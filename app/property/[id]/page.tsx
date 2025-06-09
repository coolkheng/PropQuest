"use client";

import React, { useState, useEffect } from "react";
import { PropertyDetailHeader } from "@/components/property-detail-header";
import { PropertyMainContent } from "@/components/property-main-content";
import { PropertySidebar } from "@/components/property-sidebar";

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

export default function PropertyDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(paramsPromise); // ✅ Unwrap params
  const [referrer, setReferrer] = useState<string>("/");
  const [propertyData, setPropertyData] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Fetch property data by ID
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties/${id}`);
        if (!res.ok) throw new Error("Failed to fetch property");
        const data: Property = await res.json();
        setPropertyData(data);
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading property details...</p>
      </div>
    );
  }

  if (!propertyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Property not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PropertyDetailHeader referrer={referrer} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <PropertyMainContent propertyData={propertyData as any} />
          <PropertySidebar propertyData={propertyData as any} />
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { PropertyDetailHeader } from "@/components/property-detail-header";
// import { PropertyMainContent } from "@/components/property-main-content";
// import { PropertySidebar } from "@/components/property-sidebar";

// // ✅ Locally define the Property interface
// interface Property {
//   _id: string;
//   url: string;
//   title: string;
//   address: string;
//   price: string;
//   beds: string;
//   baths: string;
//   sqft: string;
//   psf: string;
//   house_type: string;
//   furnishing: string;
//   lease_type: string;
//   date_listed: string;
//   images: string[];
//   facilities: string[];
// }

// export default function PropertyDetailPage({
//   params,
// }: {
//   params: { id: string };
// }) {
//   const [referrer, setReferrer] = useState<string>("/");
//   const [propertyData, setPropertyData] = useState<Property | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);

//   useEffect(() => {
//     const storedReferrer = sessionStorage.getItem("propertyDetailReferrer");
//     if (storedReferrer) {
//       setReferrer(storedReferrer);
//       sessionStorage.removeItem("propertyDetailReferrer");
//     } else if (document.referrer) {
//       try {
//         const referrerUrl = new URL(document.referrer);
//         const referrerPath = referrerUrl.pathname;
//         if (referrerPath.includes("/listing")) {
//           setReferrer("/listing");
//         } else if (referrerPath === "/" || referrerPath.includes("map")) {
//           setReferrer("/");
//         }
//       } catch (error) {
//         setReferrer("/");
//       }
//     }
//   }, []);

//   // Fetch property data by ID
//   useEffect(() => {
//     const fetchProperty = async () => {
//       try {
//         const res = await fetch(`/api/properties/${params.id}`);
//         if (!res.ok) throw new Error("Failed to fetch property");
//         const data: Property = await res.json();
//         setPropertyData(data);
//       } catch (error) {
//         console.error("Error fetching property:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchProperty();
//   }, [params.id]);

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p>Loading property details...</p>
//       </div>
//     );
//   }

//   if (!propertyData) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p>Property not found.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <PropertyDetailHeader referrer={referrer} />

//       <div className="max-w-7xl mx-auto px-4 py-6">
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Main content and sidebar use the limited property details */}
//           <PropertyMainContent propertyData={propertyData} />
//           <PropertySidebar propertyData={propertyData} />
//         </div>
//       </div>
//     </div>
//   );
// }
