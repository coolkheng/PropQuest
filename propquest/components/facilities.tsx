import { Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FacilitiesProps {
  facilities: string[]
}

export function Facilities({ facilities }: FacilitiesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">Facilities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {facilities.map((facility, index) => (
            <div key={index} className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-gray-700">{facility}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
