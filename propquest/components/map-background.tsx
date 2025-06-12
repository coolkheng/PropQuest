import { useEffect, useRef } from 'react';
import { loadModules } from 'esri-loader';

interface MapBackgroundProps {
  hoveredProperty: string | null;
}

export function MapBackground({ hoveredProperty }: MapBackgroundProps) {
  const mapRef = useRef(null);

  useEffect(() => {
    loadModules([
      "esri/config",
      "esri/Map",
      "esri/views/MapView",
      "esri/rest/locator",
      "esri/Graphic"
    ], { css: true }).then(([esriConfig, Map, MapView, locator, Graphic]) => {
      // Use your API key from .env
      esriConfig.apiKey = process.env.MAP_ARCGS_URI;

      const map = new Map({ basemap: "arcgis-streets" });

      const view = new MapView({
        container: mapRef.current,
        map: map,
        center: [101.6869, 3.1390], // default center (Kuala Lumpur)
        zoom: 12
      });

      // Address to geocode
      const address = {
        address: "1 Utama Shopping Centre, Petaling Jaya, Malaysia"
      };
      
      const geocodeUrl = "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

      // Use the geocoder
      locator.addressToLocations(geocodeUrl,{
        address,
        outFields: ["*"]
      }).then((results: any[]) => {
        if (results.length) {
          const location = results[0].location;

          // Create marker graphic
          const point = {
            type: "point",
            longitude: location.x,
            latitude: location.y
          };

          const marker_symbol = {
            type: "simple-marker",
            color: "blue",
            size: "12px",
            outline: {
              color: [255, 255, 255],
              width: 1
            }
          };

          const text_symbol = {
            type: "text",
            color: "black",
            text: "RM550",
            font: {
              size: 12,
              family: "Arial"
            },
            yoffset: -20, // Move text above the point
            haloColor: "white",
            haloSize: "1px"
          };

          

          view.graphics.addMany([
            new Graphic({
              geometry: point,
              symbol: marker_symbol
            }),
            new Graphic({
              geometry: point,
              symbol: text_symbol
            })
          ])
          view.goTo({ center: point, zoom: 15 });
        } else {
          console.warn("No location found for address");
        }
      }).catch((error: any) => {
        console.error("Geocoding error:", error);
      });

    }).catch((err) => {
      console.error("ArcGIS load error:", err);
    });
  }, []);

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg" />
  );
}
