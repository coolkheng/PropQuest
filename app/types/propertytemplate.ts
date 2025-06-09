export interface Property {
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

  // Fallback/optional fields (for PropertyDetailPage)
  listingType?: string;
  location?: string;
  dateListed?: string;
  dateUpdated?: string;
  referenceNumber?: string;
  priceType?: string;
  propertyType?: string;
  tenure?: string;
  titleType?: string;
  landArea?: string;
  builtUpArea?: string;
  pricePerSqFtLand?: string;
  pricePerSqFtBuiltUp?: string;
  bedrooms?: number;
  bathrooms?: number;
  unitType?: string;
  storeys?: number;
  parking?: number;
  agent?: {
    name: string;
    company: string;
    phone: string;
    email: string;
  };
  amenities?: any;
}
