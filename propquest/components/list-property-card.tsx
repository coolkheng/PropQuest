"use client"

import { Star, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ListPropertyCardProps {
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
}

export function ListPropertyCard({ property, isHovered, onMouseEnter, onMouseLeave, onClick }: ListPropertyCardProps) {
  return (
    <Link href={`/property/${property.id}`} onClick={onClick}>
      <Card
        className="w-full h-[400px] bg-white shadow-lg transition-all duration-200 cursor-pointer"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          transform: isHovered ? "translateY(-4px)" : "none",
          boxShadow: isHovered ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" : "",
        }}
      >
        {property.bestFor && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-blue-gradient text-white text-xs">Best for you</Badge>
          </div>
        )}

        {/* Image Section */}
        <div className="relative">
          <img
            src={property.image || "/placeholder.svg"}
            alt={property.name}
            className="w-full h-[200px] object-cover rounded-t-lg"
          />
        </div>

        {/* Content Section */}
        <CardContent className="p-4 h-[200px] flex flex-col justify-between">
          <div className="space-y-3">
            {/* Property Title */}
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 overflow-hidden">{property.name}</h3>

            {/* Location */}
            {property.location && (
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{property.location}</span>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {property.amenities.slice(0, 4).map((amenity, index) => (
                  <span key={index} className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded">
                    {amenity}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rating and Price Row */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{property.rating}</span>
            </div>
            <div className="bg-gray-900 text-white px-3 py-2 rounded text-sm font-semibold">
              RM{property.price}/night
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
