import { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";

interface MapBackgroundProps {
  hoveredProperty: string | null;
  Property: Property [];
}

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


export function MapBackground({ hoveredProperty , Property }: MapBackgroundProps) {
  const mapRef = useRef(null);

  useEffect(() => {
    loadModules(
      [
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/rest/locator",
        "esri/Graphic",
      ],
      { css: true }
    )
      .then(([esriConfig, Map, MapView, locator, Graphic]) => {
        // Use your API key from .env
        esriConfig.apiKey = process.env.MAP_ARCGS_URI;

        const map = new Map({ basemap: "arcgis-streets" });

        const view = new MapView({
          container: mapRef.current,
          map: map,
          center: [101.6869, 3.139], // default center (Kuala Lumpur)
          zoom: 12,
        });

        // Address to geocode
        const address = {
          address: "1 Utama Shopping Centre, Petaling Jaya, Malaysia",
        };

        const geocodeUrl =
          "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

        // Use the geocoder
        // Loop through properties
      Property.forEach((property) => {
        locator
          .addressToLocations(geocodeUrl, {
            address: { address: property.address },
            outFields: ["*"],
          })
          .then((results: any[]) => {
            if (results.length) {
              const location = results[0].location;

              const point = {
                type: "point",
                longitude: location.x,
                latitude: location.y,
              };

              const markerSymbol = {
                type: "simple-marker",
                color:  "blue",
                size: "12px",
                outline: {
                  color: [255, 255, 255],
                  width: 1,
                },
              };

              const textSymbol = {
                type: "text",
                color: "black",
                text: property.title,
                font: {
                  size: 12,
                  family: "Arial",
                  weight: "bold",
                },
                yoffset: -20,
                haloColor: "white",
                haloSize: "3px",
              };

              view.graphics.addMany([
                new Graphic({ geometry: point, symbol: markerSymbol }),
                new Graphic({ geometry: point, symbol: textSymbol }),
              ]);
            }
          })
          .catch((error: any) => {
            console.error(`Geocoding failed for ${property.address}:`, error);
          });
      });
    });
  }, [Property]);

  return <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg" />;
}
