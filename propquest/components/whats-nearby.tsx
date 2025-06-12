"use client"

import { useState } from "react"
import { MapPin, ChevronRight, Plus, Minus, Crosshair, Maximize } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WhatsNearbyProps {
  amenities: {
    foodAndDrink: Array<{ name: string; time: string; distance: string }>
    schools: string[]
    shopping: string[]
    medical: string[]
    publicTransport: string[]
  }
}

const nearbyCategories = [
  { id: "saved", name: "Saved Places" },
  { id: "train", name: "Train" },
  { id: "schools", name: "Schools" },
  { id: "shopping", name: "Shopping" },
  { id: "healthcare", name: "Healthcare" },
  { id: "food", name: "Food & Drink" },
  { id: "parks", name: "Parks" },
  { id: "banks", name: "Banks" },
]

export function WhatsNearby({ amenities }: WhatsNearbyProps) {
  const [activeNearbyCategory, setActiveNearbyCategory] = useState("food")
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)

  const estimateTimeFromDistance = (distanceStr: string) => {
    const match = distanceStr.match(/(\d+(\.\d+)?)/)
    if (!match) return "? mins"
    const distance = Number.parseFloat(match[1])
    const timeInMinutes = Math.round(distance * 12)
    return `${timeInMinutes} mins`
  }

  const getNearbyPlaces = () => {
    switch (activeNearbyCategory) {
      case "food":
        return amenities.foodAndDrink
      case "schools":
        return amenities.schools.map((school) => {
          const parts = school.split("(")
          return {
            name: parts[0].trim(),
            distance: parts[1] ? parts[1].replace(")", "") : "",
            time: estimateTimeFromDistance(parts[1] ? parts[1].replace(")", "") : ""),
          }
        })
      case "shopping":
        return amenities.shopping.map((shop) => {
          const parts = shop.split("(")
          return {
            name: parts[0].trim(),
            distance: parts[1] ? parts[1].replace(")", "") : "",
            time: estimateTimeFromDistance(parts[1] ? parts[1].replace(")", "") : ""),
          }
        })
      case "healthcare":
        return amenities.medical.map((facility) => {
          const parts = facility.split("(")
          return {
            name: parts[0].trim(),
            distance: parts[1] ? parts[1].replace(")", "") : "",
            time: estimateTimeFromDistance(parts[1] ? parts[1].replace(")", "") : ""),
          }
        })
      case "train":
        return amenities.publicTransport
          .filter((item) => item.includes("LRT") || item.includes("MRT") || item.includes("Station"))
          .map((station) => {
            const parts = station.split("(")
            return {
              name: parts[0].trim(),
              distance: parts[1] ? parts[1].replace(")", "") : "",
              time: estimateTimeFromDistance(parts[1] ? parts[1].replace(")", "") : ""),
            }
          })
      default:
        return []
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">What's nearby</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Category Pills */}
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex space-x-2">
            {nearbyCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveNearbyCategory(category.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full border ${
                  activeNearbyCategory === category.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {category.name}
              </button>
            ))}
            <button className="p-2 rounded-full border border-gray-300 bg-white text-gray-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Map and List View */}
        <div className="flex flex-col md:flex-row">
          {/* List of Places */}
          <div className="md:w-2/5 border-r border-gray-200 max-h-[400px] overflow-y-auto">
            {getNearbyPlaces().map((place, index) => (
              <div
                key={index}
                className={`flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  selectedPlace === place.name ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelectedPlace(place.name)}
              >
                <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center mr-3">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900">{place.name}</h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{place.time}</span>
                    <span className="mx-1">•</span>
                    <span>{place.distance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map View */}
          <div className="md:w-3/5 h-[400px] relative bg-blue-50">
            <div className="absolute inset-0">
              <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 relative">
                {/* Map Controls */}
                <div className="absolute right-4 bottom-4 flex flex-col space-y-2">
                  <button className="h-8 w-8 bg-white rounded-full shadow flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 bg-white rounded-full shadow flex items-center justify-center">
                    <Minus className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 bg-white rounded-full shadow flex items-center justify-center">
                    <Crosshair className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 bg-white rounded-full shadow flex items-center justify-center">
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>

                {/* Map Markers */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    {/* Main Property Marker */}
                    <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>

                    {/* Nearby Place Markers */}
                    <div className="absolute top-[-50px] left-[30px]">
                      <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="absolute top-[20px] left-[60px]">
                      <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="absolute top-[-30px] left-[-50px]">
                      <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    {/* Selected Place Info */}
                    {selectedPlace && (
                      <div className="absolute top-[-120px] left-[-100px] bg-white rounded-lg shadow-lg p-3 w-[220px]">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-sm">{selectedPlace}</h4>
                          <button className="h-5 w-5 flex items-center justify-center">
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>
                            {getNearbyPlaces().find((p) => p.name === selectedPlace)?.time} •{" "}
                            {getNearbyPlaces().find((p) => p.name === selectedPlace)?.distance}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
