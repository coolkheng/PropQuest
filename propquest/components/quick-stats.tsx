import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuickStatsProps {
  bedrooms: number
  bathrooms: number
  builtUpArea: string
  parking: number
}

export function QuickStats({ bedrooms, bathrooms, builtUpArea, parking }: QuickStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-blue-gradient">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-blue-gradient">{bedrooms}</div>
            <div className="text-sm text-gray-600">Bedrooms</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-blue-gradient">{bathrooms}</div>
            <div className="text-sm text-gray-600">Bathrooms</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-blue-gradient">
              {builtUpArea.split(" ")[0]}
            </div>
            <div className="text-sm text-gray-600">sq ft</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-blue-gradient">{parking}</div>
            <div className="text-sm text-gray-600">Parking</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
