import { ImageGallery } from "./image-gallery"
import { ListingOverview } from "./listing-overview"
import { PropertyDetails } from "./property-details"
import { WhatsNearby } from "./whats-nearby"

const amenities = {
    publicTransport: ["LRT SS2 Station (0.3km)", "Bus Stop (0.1km)", "Grab/Taxi Available"],
    schools: ["SJK(C) Chee Wen (0.5km)", "SMK SS2 (0.8km)", "Tadika Kanak-Kanak (0.2km)"],
    universities: ["University of Malaya (5.2km)", "Sunway University (8.1km)", "Taylor's University (6.3km)"],
    medical: ["SS2 Clinic (0.3km)", "Assunta Hospital (2.1km)", "University Malaya Medical Centre (4.8km)"],
    shopping: ["SS2 Mall (0.4km)", "Paradigm Mall (3.2km)", "1 Utama (7.5km)", "The Curve (6.8km)"],
    highways: ["Federal Highway (1.2km)", "LDP (2.1km)", "NPE (3.5km)", "SPRINT (4.2km)"],
    foodAndDrink: [
      { name: "Rich Kopitiam Elmina", time: "3 mins", distance: "240 m" },
      { name: "Sushi Zanmai Elmina", time: "6 mins", distance: "520 m" },
      { name: "Mee Hiris China Elmina", time: "6 mins", distance: "530 m" },
      { name: "Burger King - Elmina", time: "6 mins", distance: "540 m" },
      { name: "Ole-Ole Bali, Elmina", time: "7 mins", distance: "560 m" },
      { name: "Chica Bonita @ Elmina", time: "7 mins", distance: "560 m" },
      { name: "Kenny Hills Bakery Elmina", time: "7 mins", distance: "590 m" },
      { name: "Nyonya Colors Elmina", time: "7 mins", distance: "590 m" },
      { name: "NakNak 낙낙 Elmina", time: "7 mins", distance: "590 m" },
      { name: "Subway Elmina Lifestyle", time: "7 mins", distance: "600 m" },
    ],
  }
  
interface PropertyMainContentProps {
  propertyData: {
  _id: string;
  url: string;
  title: string;
  address: string;
  price: string;
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
  }
}

export function PropertyMainContent({ propertyData }: PropertyMainContentProps) {
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

      <WhatsNearby amenities={amenities} />
    </div>
  )
}
