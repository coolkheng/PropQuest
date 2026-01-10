"use client"

import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface MapPropertyCardProps {
  property: {
    id: number
    name: string
    rating: number
    price: number
    image: string
    bestFor?: boolean
  }
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
}

export function MapPropertyCard({ property, isHovered, onMouseEnter, onMouseLeave, onClick }: MapPropertyCardProps) {
  return (
    <Link href={`/property/${property.id}`} onClick={onClick}>
      <Card
        className="w-[200px] h-[240px] bg-white shadow-lg transition-all duration-200 cursor-pointer flex-shrink-0"
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
            className="w-full h-[120px] object-cover rounded-t-lg"
          />
        </div>

        {/* Content Section */}
        <CardContent className="p-3 h-[120px] flex flex-col justify-between">
          {/* Property Title */}
          <h3 className="font-medium text-sm mb-2 line-clamp-2 overflow-hidden leading-tight">
            {property.name.length > 50 ? `${property.name.substring(0, 50)}...` : property.name}
          </h3>

          {/* Rating and Price Row */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{property.rating}</span>
            </div>
            <div className="bg-gray-900 text-white px-2 py-1 rounded text-sm font-semibold">RM{property.price}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
