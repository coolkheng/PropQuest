import { ContactAgent } from "./contact-agent"
import { QuickStats } from "./quick-stats"
import { Facilities } from "./facilities"
import { SimilarProperties } from "./similar-properties"

interface PropertySidebarProps {
  propertyData: {
    agent: {
      name: string
      company: string
      phone: string
      email: string
    }
    bedrooms: number
    bathrooms: number
    builtUpArea: string
    parking: number
    facilities: string[]
  }
}

export function PropertySidebar({ propertyData }: PropertySidebarProps) {
  return (
    <div className="space-y-6">
      <ContactAgent agent={propertyData.agent} />
      <QuickStats
        bedrooms={propertyData.bedrooms}
        bathrooms={propertyData.bathrooms}
        builtUpArea={propertyData.builtUpArea}
        parking={propertyData.parking}
      />
      <Facilities facilities={propertyData.facilities} />
      <SimilarProperties />
    </div>
  )
}
