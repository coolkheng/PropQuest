"use client";

import { Bed, Bath, Square, DollarSign, MapPin } from "lucide-react";

// ✅ Locally define the Property interface
interface Property {
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

interface PropertyGridProps {
  properties: Property[];
  onPropertyClick: (id: string) => void;
}

export function PropertyGrid({
  properties,
  onPropertyClick,
}: PropertyGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <div
          key={property._id}
          onClick={() => onPropertyClick(property._id)}
          className="group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200"
        >
          {/* Image Section */}
          <div className="relative overflow-hidden">
            <img
              src={property.images[0] || "/placeholder.svg"}
              alt={property.title}
              className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Content Section */}
          <div className="p-5">
            {/* Title and Location */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                {property.title}
              </h3>
              <div className="flex items-center text-gray-600 mb-3">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{property.address}</span>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Bed className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold">{property.beds}</span>
                  <span className="text-xs text-gray-500 ml-1">beds</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <div className="bg-green-50 p-2 rounded-lg">
                  <Bath className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold">
                    {property.baths}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">baths</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <div className="bg-purple-50 p-2 rounded-lg">
                  <Square className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold">
                    {Number(property.sqft).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">sqft</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <div className="bg-orange-50 p-2 rounded-lg">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold">{property.psf}</span>
                  <span className="text-xs text-gray-500 ml-1">psf</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="mb-4">
              <span className="text-2xl font-bold text-gray-900">
                {property.price}
              </span>
            </div>

            {/* Facilities (Limited to 4) */}
            <div className="flex flex-wrap gap-2">
              {property.facilities.slice(0, 4).map((facility, index) => (
                <span
                  key={index}
                  className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border"
                >
                  {facility}
                </span>
              ))}
              {property.facilities.length > 4 && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                  +{property.facilities.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
