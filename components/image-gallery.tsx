"use client"

import { useState } from "react"
import { Heart, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ImageGalleryProps {
  images: string[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={images[currentImageIndex] || "/placeholder.svg"}
            alt={title}
            className="w-full h-96 object-cover rounded-t-lg"
          />
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsFavorited(!isFavorited)}
              className="bg-white/90 hover:bg-white"
            >
              <Heart className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex space-x-2 overflow-x-auto">
            {images.map((image, index) => (
              <img
                key={index}
                src={image || "/placeholder.svg"}
                alt={`Property ${index + 1}`}
                className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${
                  currentImageIndex === index ? "border-blue-500" : "border-gray-200"
                }`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
