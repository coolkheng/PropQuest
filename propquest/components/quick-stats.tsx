import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuickStatsProps {
  beds: number
  baths: number
  sqft: string
  parking: number
}

export function QuickStats({ beds, baths, sqft, parking }: QuickStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">{beds}</div>
            <div className="text-sm text-gray-600">Bedrooms</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">{baths}</div>
            <div className="text-sm text-gray-600">Bathrooms</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
              {sqft.split(" ")[0]}
            </div>
            <div className="text-sm text-gray-600">sq ft</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">{parking}</div>
            <div className="text-sm text-gray-600">Parking</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
