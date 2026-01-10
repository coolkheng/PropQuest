import { ExternalLink, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface ViewOnPropertyGuruProps {
  propertyUrl?: string
  propertyId?: string
}

export function ViewOnPropertyGuru({
  propertyUrl = "https://www.propertyguru.com.sg",
  propertyId,
}: ViewOnPropertyGuruProps) {
  const fullUrl = propertyId ? `${propertyUrl}/property/${propertyId}` : propertyUrl

  return (
    <Card className="overflow-hidden border-2 border-red-100 hover:border-red-300 transition-colors">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-18 h-18 flex-shrink-0">
                <Image src="/propertyguru-logo.png" alt="PropertyGuru" fill className="object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View on PropertyGuru</h3>
                <p className="text-sm text-gray-600">See full listing details</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-red-500 flex-shrink-0" />
          </div>

          <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 group shadow-md hover:shadow-lg">
              Visit PropertyGuru
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </a>

          <p className="text-xs text-gray-500 text-center">Get more information, photos, and contact details</p>
        </div>
      </CardContent>
    </Card>
  )
}
