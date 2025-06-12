import { ContactAgent } from "./contact-agent"
import { QuickStats } from "./quick-stats"
import { Facilities } from "./facilities"
import { SimilarProperties } from "./similar-properties"

interface PropertySidebarProps {
  propertyData: {
    beds: string
    baths: string
    sqft: string
    facilities: string[]
  }
}

const agent =  {
    name: "Sarah Lim",
    company: "PropQuest Realty",
    phone: "+60 12-345 6789",
    email: "sarah.lim@propquest.com",
  }

export function PropertySidebar({ propertyData }: PropertySidebarProps) {
  return (
    <div className="space-y-6">
      <ContactAgent agent={agent} />
      <QuickStats
        beds={parseInt(propertyData.beds)}
        baths={parseInt(propertyData.baths)}
        sqft={propertyData.sqft}
        parking={1}
      />
      <Facilities facilities={propertyData.facilities} />
      <SimilarProperties />
    </div>
  )
}
