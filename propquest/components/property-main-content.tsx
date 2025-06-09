import { ImageGallery } from "./image-gallery"
import { ListingOverview } from "./listing-overview"
import { PropertyDetails } from "./property-details"
import { WhatsNearby } from "./whats-nearby"

interface PropertyMainContentProps {
  propertyData: {
    images: string[]
    title: string
    listingType: string
    location: string
    dateListed: string
    dateUpdated: string
    referenceNumber: string
    price: string
    priceType: string
    propertyType: string
    tenure: string
    titleType: string
    landArea: string
    builtUpArea: string
    unitType: string
    pricePerSqFtBuiltUp: string
    bedrooms: number
    bathrooms: number
    parking: number
    storeys: number
    furnishing: string
    amenities: any
  }
}

export function PropertyMainContent({ propertyData }: PropertyMainContentProps) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <ImageGallery images={propertyData.images} title={propertyData.title} />

      <ListingOverview
        title={propertyData.title}
        listingType={propertyData.listingType}
        location={propertyData.location}
        dateListed={propertyData.dateListed}
        dateUpdated={propertyData.dateUpdated}
        referenceNumber={propertyData.referenceNumber}
        price={propertyData.price}
        priceType={propertyData.priceType}
      />

      <PropertyDetails
        propertyType={propertyData.propertyType}
        tenure={propertyData.tenure}
        titleType={propertyData.titleType}
        landArea={propertyData.landArea}
        builtUpArea={propertyData.builtUpArea}
        unitType={propertyData.unitType}
        pricePerSqFtBuiltUp={propertyData.pricePerSqFtBuiltUp}
        bedrooms={propertyData.bedrooms}
        bathrooms={propertyData.bathrooms}
        parking={propertyData.parking}
        storeys={propertyData.storeys}
        furnishing={propertyData.furnishing}
      />

      <WhatsNearby amenities={propertyData.amenities} />
    </div>
  )
}
