import { ImageGallery } from "./image-gallery";
import { ListingOverview } from "./listing-overview";
import { PropertyDetails } from "./property-details";

interface PropertyMainContentProps {
  propertyData: {
    _id: string;
    url: string;
    title: string;
    address: string;
    price: number;
    beds: string;
    baths: string;
    sqft: string;
    psf: string;
    house_type: string;
    furnishing: string;
    lease_type: string;
    date_listed: string;
    images: string[];
    facilities: string[];
  };
}

export function PropertyMainContent({
  propertyData,
}: PropertyMainContentProps) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <ImageGallery images={propertyData.images} title={propertyData.title} />

      <ListingOverview
        title={propertyData.title}
        listingType={propertyData.house_type}
        location={propertyData.address}
        dateListed={propertyData.date_listed}
        // dateUpdated={propertyData.dateUpdated}
        // referenceNumber={propertyData.referenceNumber}
        price={propertyData.price}
        // priceType={propertyData.priceType}
      />

      <PropertyDetails
        propertyType={propertyData.house_type}
        tenure={propertyData.lease_type}
        // titleType={propertyData.titleType}
        // landArea={propertyData.landArea}
        builtUpArea={propertyData.sqft}
        // unitType={propertyData.propertyType}
        pricePerSqFtBuiltUp={propertyData.psf}
        bedrooms={parseInt(propertyData.beds)}
        bathrooms={parseInt(propertyData.baths)}
        furnishing={propertyData.furnishing}
      />
    </div>
  );
}
