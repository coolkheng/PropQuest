import { MapPin, Calendar, Hash } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ListingOverviewProps {
  title: string
  listingType: string
  location: string
  dateListed: string
  dateUpdated: string
  referenceNumber: string
  price: string
  priceType: string
}

export function ListingOverview({
  title,
  listingType,
  location,
  dateListed,
  dateUpdated,
  referenceNumber,
  price,
  priceType,
}: ListingOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">Listing Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <Badge className="bg-green-100 text-green-800 mb-2">{listingType}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center text-gray-600">
            <MapPin className="h-5 w-5 mr-2" />
            <span>{location}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="h-5 w-5 mr-2" />
            <span>Listed: {new Date(dateListed).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Hash className="h-5 w-5 mr-2" />
            <span>Ref: {referenceNumber}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="h-5 w-5 mr-2" />
            <span>Updated: {new Date(dateUpdated).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
            {price}
            <span className="text-lg font-normal text-gray-600 ml-2">{priceType}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
