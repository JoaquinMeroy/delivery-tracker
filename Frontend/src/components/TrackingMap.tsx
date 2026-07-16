import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "../types/tracking";

const riderIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function useAnimatedPosition(
  target: LatLng | null,
  durationMs = 1800,
): LatLng | null {
  const [displayPosition, setDisplayPosition] = useState<LatLng | null>(target);
  const fromRef = useRef<LatLng | null>(target);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!target) return;

    const from = fromRef.current ?? target;
    const start = performance.now();

    function step(now: number) {
      const t = Math.min((now - start) / durationMs, 1);
      setDisplayPosition({
        lat: from.lat + (target!.lat - from.lat) * t,
        lng: from.lng + (target!.lng - from.lng) * t,
      });

      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    }

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, durationMs]);

  return displayPosition;
}

interface RecenterProps {
  position: LatLng;
}

function Recenter({ position }: RecenterProps) {
  const map = useMap();
  useEffect(() => {
    map.panTo(position);
  }, [position, map]);
  return null;
}

interface TrackingMapProps {
  riderPosition: LatLng | null;
  destination?: LatLng;
  fallbackCenter?: LatLng;
  routeCoordinates?: LatLng[];
}

export default function TrackingMap({
  riderPosition,
  destination,
  fallbackCenter = { lat: 14.5995, lng: 120.9842 },
  routeCoordinates,
}: TrackingMapProps) {
  const animatedRiderPosition = useAnimatedPosition(riderPosition);
  const center = animatedRiderPosition ?? fallbackCenter;

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {animatedRiderPosition && (
        <>
          <Marker position={animatedRiderPosition} icon={riderIcon}>
            <Popup>Rider is here</Popup>
          </Marker>
          <Recenter position={animatedRiderPosition} />
        </>
      )}

      {destination && (
        <Marker position={destination}>
          <Popup>Drop-off</Popup>
        </Marker>
      )}

      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates.map((p) => [p.lat, p.lng])}
          color="#3388ff"
          weight={5}
        />
      )}
    </MapContainer>
  );
}
