import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Info } from 'lucide-react';

export interface RouteWaypoint {
  order?: number;
  name: string;
  latitude: number;
  longitude: number;
  time?: string;
  location?: string;
}

interface RouteMapProps {
  waypoints: RouteWaypoint[];
  routeGeometry?: [number, number][];
  isRoadRoute?: boolean;
  provider?: string;
  attribution?: string;
  height?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  waypoints = [],
  routeGeometry,
  isRoadRoute = true,
  provider = 'OpenStreetMap + OSRM',
  attribution = 'Map data © OpenStreetMap contributors, routing by OSRM',
  height = '380px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Filter valid waypoints
    const validWaypoints = waypoints.filter(
      (w) =>
        typeof w.latitude === 'number' &&
        typeof w.longitude === 'number' &&
        !isNaN(w.latitude) &&
        !isNaN(w.longitude)
    );

    if (validWaypoints.length === 0) return;

    // Destroy prior map instance if existing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] = [
      validWaypoints[0].latitude,
      validWaypoints[0].longitude,
    ];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    // Add numbered pin markers
    validWaypoints.forEach((wp, idx) => {
      const orderNum = wp.order || idx + 1;
      const markerHtml = `
        <div style="
          background-color: #10B981;
          color: #064E3B;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
          cursor: pointer;
        ">${orderNum}</div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([wp.latitude, wp.longitude], {
        icon: customIcon,
      }).addTo(map);

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 150px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 2px;">Stop ${orderNum}: ${wp.name}</div>
          ${wp.time ? `<div style="color: #059669; font-weight: 600; font-size: 11px;">${wp.time}</div>` : ''}
          ${wp.location ? `<div style="color: #6B7280; font-size: 11px; margin-top: 2px;">${wp.location}</div>` : ''}
          <div style="color: #9CA3AF; font-size: 10px; margin-top: 4px;">(${wp.latitude.toFixed(4)}, ${wp.longitude.toFixed(4)})</div>
        </div>
      `;
      marker.bindPopup(popupContent);

      bounds.extend([wp.latitude, wp.longitude]);
    });

    // Add road polyline if route geometry exists, or connect waypoints with dashed line
    if (routeGeometry && routeGeometry.length >= 2) {
      const polyline = L.polyline(routeGeometry, {
        color: isRoadRoute ? '#10B981' : '#F59E0B',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isRoadRoute ? undefined : '6, 8',
      }).addTo(map);

      bounds.extend(polyline.getBounds());
    } else if (validWaypoints.length >= 2) {
      const fallbackPoints: [number, number][] = validWaypoints.map((w) => [
        w.latitude,
        w.longitude,
      ]);
      const polyline = L.polyline(fallbackPoints, {
        color: '#F59E0B',
        weight: 3,
        opacity: 0.75,
        dashArray: '5, 8',
      }).addTo(map);

      bounds.extend(polyline.getBounds());
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    }

    // Force map to recalculate container size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [waypoints, routeGeometry, isRoadRoute]);

  const validCount = waypoints.filter(
    (w) => typeof w.latitude === 'number' && typeof w.longitude === 'number'
  ).length;

  if (validCount === 0) {
    return (
      <div
        style={{ height }}
        className="w-full bg-surface-alt/30 border border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center text-muted"
      >
        <MapPin className="w-8 h-8 text-muted/40 mb-2" />
        <p className="text-xs font-semibold text-text">No Coordinate Pins Available</p>
        <p className="text-[11px] text-muted max-w-xs mt-1">
          Stop coordinates are generating or will be mapped when route optimization runs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-border shadow-inner"
        style={{ height }}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top-right mode/status badge */}
        <div className="absolute top-3 right-3 z-[1000] bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/80 text-[11px] font-semibold text-text shadow-md flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span>{isRoadRoute ? 'OSRM Road Route' : 'Straight-Line Estimate'}</span>
        </div>
      </div>

      {/* Attribution footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {attribution} • {validCount} stops mapped
          </span>
        </div>
        <div className="text-[10px] text-muted/80">
          OSRM Public Demo Server (Demonstration Use)
        </div>
      </div>
    </div>
  );
};
