"use client"

import { Star, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface PropertyCardProps {
  property: {
    id: number
    name: string
    rating: number
    price: number
    image: string
    bestFor?: boolean
    location?: string
    amenities?: string[]
  }
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
  size?: "small" | "large"
}

export function PropertyCard({
  property,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  size = "small",
}: PropertyCardProps) {
  const cardSize = size === "small" ? "w-[220px] h-[260px]" : "w-full h-[400px]"
  const imageHeight = size === "small" ? "h-[140px]" : "h-[200px]"
  const contentHeight = size === "small" ? "h-[120px]" : "h-[200px]"
  const textSize = size === "small" ? "text-xs" : "text-lg"

  return (
    <Link href={`/property/${property.id}`} onClick={onClick}>
      <Card
        className={`${cardSize} bg-white shadow-lg transition-all duration-200 cursor-pointer ${size === "small" ? "flex-shrink-0" : ""}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          transform: isHovered ? "translateY(-4px)" : "none",
          boxShadow: isHovered ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" : "",
        }}
      >
        {property.bestFor && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white text-xs">Best for you</Badge>
          </div>
        )}
        <div className="relative">
          <img
            src={property.image || "/placeholder.svg"}
            alt={property.name}
            className={`w-full ${imageHeight} object-cover rounded-t-lg`}
          />
        </div>
        <CardContent className={`p-3 ${contentHeight} flex flex-col justify-between`}>
          <div className="space-y-2">
            <h3
              className={`font-semibold ${size === "small" ? "text-sm" : "text-lg"} mb-1 line-clamp-2 overflow-hidden`}
            >
              {size === "small" && property.name.length > 40 ? `${property.name.substring(0, 40)}...` : property.name}
            </h3>

            {property.location && (
              <div className="flex items-center text-gray-600 text-xs">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{property.location}</span>
              </div>
            )}

            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {property.amenities.slice(0, 4).map((amenity, index) => (
                  <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {amenity}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1">
              <Star className={`${size === "small" ? "h-3 w-3" : "h-4 w-4"} fill-yellow-400 text-yellow-400`} />
              <span className={`${size === "small" ? "text-xs" : "text-sm"} font-medium`}>{property.rating}</span>
            </div>
            <div
              className={`bg-gray-900 text-white px-2 py-1 rounded ${size === "small" ? "text-xs" : "text-sm"} font-semibold`}
            >
              RM{property.price}
              {size === "small" ? "/night" : "/night"}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
