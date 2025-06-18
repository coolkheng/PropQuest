"use client"

import { useState, useEffect } from "react"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { PropertyMainContent } from "@/components/property-main-content"
import { PropertySidebar } from "@/components/property-sidebar"



// Sample property data - in a real app, this would come from an API
// const propertyData = {
//   id: 1,
//   title: "Victor Hugo - Cozy charming studio heart 16e",
//   listingType: "For Rent",
//   location: "SS2, Petaling Jaya, Selangor",
//   price: "RM 2,100",
//   priceType: "per month",
//   dateListed: "2024-01-15",
//   dateUpdated: "2024-01-20",
//   referenceNumber: "PQ-001234",
//   images: [
//     "/placeholder.svg?height=400&width=600",
//     "/placeholder.svg?height=400&width=600",
//     "/placeholder.svg?height=400&width=600",
//     "/placeholder.svg?height=400&width=600",
//   ],
//   propertyType: "Condominium",
//   tenure: "Leasehold",
//   titleType: "Individual Title",
//   landArea: "N/A",
//   builtUpArea: "850 sq ft",
//   pricePerSqFtLand: "N/A",
//   pricePerSqFtBuiltUp: "RM 2.47",
//   bedrooms: 2,
//   bathrooms: 2,
//   unitType: "Intermediate",
//   storeys: 1,
//   parking: 1,
//   furnishing: "Fully Furnished",
//   amenities: {
//     publicTransport: ["LRT SS2 Station (0.3km)", "Bus Stop (0.1km)", "Grab/Taxi Available"],
//     schools: ["SJK(C) Chee Wen (0.5km)", "SMK SS2 (0.8km)", "Tadika Kanak-Kanak (0.2km)"],
//     universities: ["University of Malaya (5.2km)", "Sunway University (8.1km)", "Taylor's University (6.3km)"],
//     medical: ["SS2 Clinic (0.3km)", "Assunta Hospital (2.1km)", "University Malaya Medical Centre (4.8km)"],
//     shopping: ["SS2 Mall (0.4km)", "Paradigm Mall (3.2km)", "1 Utama (7.5km)", "The Curve (6.8km)"],
//     highways: ["Federal Highway (1.2km)", "LDP (2.1km)", "NPE (3.5km)", "SPRINT (4.2km)"],
//     foodAndDrink: [
//       { name: "Rich Kopitiam Elmina", time: "3 mins", distance: "240 m" },
//       { name: "Sushi Zanmai Elmina", time: "6 mins", distance: "520 m" },
//       { name: "Mee Hiris China Elmina", time: "6 mins", distance: "530 m" },
//       { name: "Burger King - Elmina", time: "6 mins", distance: "540 m" },
//       { name: "Ole-Ole Bali, Elmina", time: "7 mins", distance: "560 m" },
//       { name: "Chica Bonita @ Elmina", time: "7 mins", distance: "560 m" },
//       { name: "Kenny Hills Bakery Elmina", time: "7 mins", distance: "590 m" },
//       { name: "Nyonya Colors Elmina", time: "7 mins", distance: "590 m" },
//       { name: "NakNak 낙낙 Elmina", time: "7 mins", distance: "590 m" },
//       { name: "Subway Elmina Lifestyle", time: "7 mins", distance: "600 m" },
//     ],
//   },
//   facilities: [
//     "24 hours security",
//     "Community garden",
//     "Covered car park",
//     "Drop off point",
//     "Multi-storey car park",
//     "Parking",
//     "Playground",
//     "Swimming pool",
//   ],
//   agent: {
//     name: "Sarah Lim",
//     company: "PropQuest Realty",
//     phone: "+60 12-345 6789",
//     email: "sarah.lim@propquest.com",
//   },
// }

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

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const [referrer, setReferrer] = useState<string>("/")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [propertyData, setPropertyData] = useState<Property | null>(null)
  
  useEffect(() => {
    const storedReferrer = sessionStorage.getItem("propertyDetailReferrer")
    if (storedReferrer) {
      setReferrer(storedReferrer)
      sessionStorage.removeItem("propertyDetailReferrer")
    } else if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer)
        const referrerPath = referrerUrl.pathname
        if (referrerPath.includes("/listing")) {
          setReferrer("/listing")
        } else if (referrerPath === "/" || referrerPath.includes("map")) {
          setReferrer("/")
        }
      } catch (error) {
        setReferrer("/")
      }
    }
  }, [])

   useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true)
        const { id } =await params

        const res = await fetch(`/api/properties/${id}`)
        if (!res.ok) throw new Error("Failed to fetch property data")
        const data = await res.json()
        setPropertyData(data)
      } catch (err) {
        console.error(err)
        setError("Property not found or server error")
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [params])

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
      </div>
    </div>
  )
}
