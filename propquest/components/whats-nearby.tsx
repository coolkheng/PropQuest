"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  ChevronRight,
  Plus,
  Minus,
  Crosshair,
  Maximize,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadModules } from "esri-loader";

interface WhatsNearbyProps {
  address: string;
  amenities: {
    foodAndDrink: Array<{ name: string; time: string; distance: string }>;
    schools: string[];
    shopping: string[];
    medical: string[];
    publicTransport: string[];
  };
}

const nearbyCategories = [
  { id: "saved", name: "Saved Places" },
  { id: "train", name: "Train" },
  { id: "schools", name: "Schools" },
  { id: "shopping", name: "Shopping" },
  { id: "healthcare", name: "Healthcare" },
  { id: "food", name: "Food & Drink" },
  { id: "parks", name: "Parks" },
  { id: "banks", name: "Banks" },
];

const geocodeUrl =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

export function WhatsNearby({ address, amenities }: WhatsNearbyProps) {
  const [activeNearbyCategory, setActiveNearbyCategory] = useState("food");
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  // Initialize ArcGIS map
  useEffect(() => {
    if (!mapRef.current) return;

    loadModules(
      [
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/rest/locator",
        "esri/Graphic",
      ],
      { css: true },
    )
      .then(([esriConfig, Map, MapView, locator, Graphic]) => {
        esriConfig.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;

        const map = new Map({ basemap: "streets" });

        viewRef.current = new MapView({
          container: mapRef.current,
          map: map,
          center: [101.6869, 3.139],
          zoom: 15,
        });

        // Geocode the property address
        locator
          .addressToLocations(geocodeUrl, {
            address: { address: address },
            outFields: ["*"],
          })
          .then((results: any[]) => {
            if (results.length) {
              const location = results[0].location;

              // Center map on property
              viewRef.current.center = [location.x, location.y];

              // Add property marker
              const point = {
                type: "point",
                longitude: location.x,
                latitude: location.y,
              };

              const markerSymbol = {
                type: "picture-marker",
                url: "/location-pin.png",
                width: "40px",
                height: "40px",
              };

              const graphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: {
                  address: address,
                },
              });

              viewRef.current.graphics.add(graphic);
              setIsMapLoading(false);
            }
          })
          .catch((error: any) => {
            console.error("Geocoding failed:", error);
            setIsMapLoading(false);
          });
      })
      .catch((error) => {
        console.error("Map initialization failed:", error);
        setIsMapLoading(false);
      });

    return () => {
      if (viewRef.current && typeof viewRef.current.destroy === "function") {
        try {
          viewRef.current.destroy();
        } catch {}
      }
      viewRef.current = null;
    };
  }, [address]);

  const estimateTimeFromDistance = (distanceStr: string) => {
    const match = distanceStr.match(/(\d+(\.\d+)?)/);
    if (!match) return "? mins";
    const distance = Number.parseFloat(match[1]);
    const timeInMinutes = Math.round(distance * 12);
    return `${timeInMinutes} mins`;
  };

  const getNearbyPlaces = () => {
    switch (activeNearbyCategory) {
      case "food":
        return amenities.foodAndDrink;
      case "schools":
        return amenities.schools.map((school) => {
          const parts = school.split("(");
          return {
            name: parts[0].trim(),
            distance: parts[1] ? parts[1].replace(")", "") : "",
            time: estimateTimeFromDistance(
              parts[1] ? parts[1].replace(")", "") : "",
            ),
          };
        });
      case "shopping":
        return amenities.shopping.map((shop) => {
          const parts = shop.split("(");
          return {
            name: parts[0].trim(),
            distance: parts[1] ? parts[1].replace(")", "") : "",
            time: estimateTimeFromDistance(
              parts[1] ? parts[1].replace(")", "") : "",
            ),
          };
        });
      case "healthcare":
        return amenities.medical.map((facility) => {
          const parts = facility.split("(");
          return {
            name: parts[0].trim(),
            distance: parts[1] ? parts[1].replace(")", "") : "",
            time: estimateTimeFromDistance(
              parts[1] ? parts[1].replace(")", "") : "",
            ),
          };
        });
      case "train":
        return amenities.publicTransport
          .filter(
            (item) =>
              item.includes("LRT") ||
              item.includes("MRT") ||
              item.includes("Station"),
          )
          .map((station) => {
            const parts = station.split("(");
            return {
              name: parts[0].trim(),
              distance: parts[1] ? parts[1].replace(")", "") : "",
              time: estimateTimeFromDistance(
                parts[1] ? parts[1].replace(")", "") : "",
              ),
            };
          });
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
          What's nearby
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Category Pills */}
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex space-x-2">
            {nearbyCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveNearbyCategory(category.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full border ${
                  activeNearbyCategory === category.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {category.name}
              </button>
            ))}
            <button className="p-2 rounded-full border border-gray-300 bg-white text-gray-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Map and List View */}
        <div className="flex flex-col md:flex-row">
          {/* List of Places */}
          <div className="md:w-2/5 border-r border-gray-200 max-h-[400px] overflow-y-auto">
            {getNearbyPlaces().map((place, index) => (
              <div
                key={index}
                className={`flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  selectedPlace === place.name ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelectedPlace(place.name)}
              >
                <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center mr-3">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900">
                    {place.name}
                  </h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{place.time}</span>
                    <span className="mx-1">•</span>
                    <span>{place.distance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map View */}
          <div className="md:w-3/5 h-[400px] relative bg-gray-100">
            {isMapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Loading map...</p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
