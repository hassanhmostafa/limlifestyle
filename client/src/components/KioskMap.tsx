import { useEffect, useRef } from "react";
import { MapView } from "@/components/Map";
import { Kiosk } from "@/lib/kiosks";

interface KioskMapProps {
  kiosks: Kiosk[];
  selectedKiosk: Kiosk | null;
  language?: string;
}

interface MarkerWithInfo extends google.maps.marker.AdvancedMarkerElement {
  infoWindow?: google.maps.InfoWindow;
}

export default function KioskMap({ kiosks, selectedKiosk, language = "en" }: KioskMapProps) {
  const isAr = language === "ar";
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<MarkerWithInfo[]>([]);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;

    // Set initial center to Jeddah
    map.setCenter({ lat: 21.5433, lng: 39.1726 });
    map.setZoom(12);

    // Add markers for all kiosks
    addMarkers(map, kiosks);
  };

  const addMarkers = async (map: google.maps.Map, kioskList: Kiosk[]) => {
    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];

    // Wait for marker library to be available
    if (!window.google?.maps?.marker) {
      setTimeout(() => addMarkers(map, kioskList), 100);
      return;
    }

    // Add new markers
    kioskList.forEach((kiosk) => {
      const lat = typeof kiosk.latitude === 'string' ? parseFloat(kiosk.latitude) : kiosk.latitude;
      const lng = typeof kiosk.longitude === 'string' ? parseFloat(kiosk.longitude) : kiosk.longitude;
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: kiosk.name,
      }) as MarkerWithInfo;

      // Create info window content
      const hoursLabel = isAr ? 'ساعات العمل:' : 'Hours:';
      const distanceLabel = isAr ? 'المسافة:' : 'Distance:';
      const naLabel = isAr ? 'غير متاح' : 'N/A';
      const viewDetailsLabel = isAr ? 'عرض التفاصيل' : 'View Details';
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${kiosk.name}</h3>
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">${kiosk.location}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">${kiosk.address}</p>
            <div style="margin: 8px 0; padding: 8px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">
                <strong>${hoursLabel}</strong> ${kiosk.hours?.[0]?.open ?? naLabel} - ${kiosk.hours?.[0]?.close ?? naLabel}
              </p>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">
                <strong>${distanceLabel}</strong> ${kiosk.distance?.toFixed(1)} km
              </p>
            </div>
            <a href="/station/${kiosk.id}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;">
              ${viewDetailsLabel}
            </a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        // Close all other info windows
        markersRef.current.forEach((m) => {
          if (m.infoWindow) {
            m.infoWindow.close();
          }
        });
        infoWindow.open({
          anchor: marker,
          map,
        });
      });

      // Attach info window to marker for later reference
      marker.infoWindow = infoWindow;

      markersRef.current.push(marker);
    });
  };

  // Update markers when kiosks change
  useEffect(() => {
    if (mapRef.current) {
      addMarkers(mapRef.current, kiosks);
    }
  }, [kiosks]);

  // Pan to selected kiosk
  useEffect(() => {
    if (selectedKiosk && mapRef.current) {
      const panLat = typeof selectedKiosk.latitude === 'string' ? parseFloat(selectedKiosk.latitude) : selectedKiosk.latitude;
      const panLng = typeof selectedKiosk.longitude === 'string' ? parseFloat(selectedKiosk.longitude) : selectedKiosk.longitude;
      mapRef.current.panTo({ lat: panLat, lng: panLng });
      mapRef.current.setZoom(14);

      // Open info window for selected marker
      const selLat = typeof selectedKiosk.latitude === 'string' ? parseFloat(selectedKiosk.latitude) : selectedKiosk.latitude;
      const selLng = typeof selectedKiosk.longitude === 'string' ? parseFloat(selectedKiosk.longitude) : selectedKiosk.longitude;
      const marker = markersRef.current.find((m) => {
        const pos = m.position as any;
        return Math.abs(pos.lat - selLat) < 0.0001 && Math.abs(pos.lng - selLng) < 0.0001;
      });

      if (marker && marker.infoWindow) {
        marker.infoWindow.open({
          anchor: marker,
          map: mapRef.current,
        });
      }
    }
  }, [selectedKiosk]);

  return <MapView onMapReady={handleMapReady} className="w-full h-full" />;
}
