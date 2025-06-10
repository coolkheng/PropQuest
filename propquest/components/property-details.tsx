import { Bed, Bath, Car } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PropertyDetailsProps {
  propertyType: string
  tenure: string
  // titleType: string
  // landArea: string
  builtUpArea: string
  // unitType: string
  pricePerSqFtBuiltUp: string
  bedrooms: number
  bathrooms: number
  furnishing: string
}

export function PropertyDetails({
  propertyType,
  tenure,
  // titleType,
  // landArea,
  builtUpArea,
  // unitType,
  pricePerSqFtBuiltUp,
  bedrooms,
  bathrooms,
  furnishing,
}: PropertyDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">Property Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Property Type:</span>
              <span className="font-medium">{propertyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tenure:</span>
              <span className="font-medium">{tenure}</span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-gray-600">Title Type:</span>
              <span className="font-medium">{titleType}</span>
            </div> */}
            {/* <div className="flex justify-between">
              <span className="text-gray-600">Land Area:</span>
              <span className="font-medium">{landArea}</span>
            </div> */}
            <div className="flex justify-between">
              <span className="text-gray-600">Built-up Area:</span>
              <span className="font-medium">{builtUpArea}</span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-gray-600">Unit Type:</span>
              <span className="font-medium">{unitType}</span>
            </div> */}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Price/sq ft (Built-up):</span>
              <span className="font-medium">{pricePerSqFtBuiltUp}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bedrooms:</span>
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span className="font-medium">{bedrooms}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bathrooms:</span>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span className="font-medium">{bathrooms}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Parking:</span>
              <div className="flex items-center">
                <Car className="h-4 w-4 mr-1" />
                <span className="font-medium">{3}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storeys:</span>
              <span className="font-medium">{1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Furnishing:</span>
              <span className="font-medium">{furnishing}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
