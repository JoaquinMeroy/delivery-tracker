import type { LatLng } from "../types/tracking";

export interface RouteResult {
  coordinates: LatLng[]; // the road path, for drawing a polyline
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

/**
 * Fetches a driving route between two points using OSRM's free public demo server.
 * NOTE: the public demo server is fine for development/portfolio use but is
 * rate-limited and not meant for production traffic — self-host OSRM or use
 * a paid provider (Mapbox, Google) if this ever needs to handle real users.
 */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<RouteResult | null> {
  const url = `${OSRM_BASE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM request failed: ${res.status}`);

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];

    // OSRM returns coordinates as [lng, lat] pairs — Leaflet wants {lat, lng}
    const coordinates: LatLng[] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ lat, lng }),
    );

    return {
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      distanceText: formatDistance(route.distance),
      durationText: formatDuration(route.duration),
    };
  } catch (err) {
    console.error("Failed to fetch route:", err);
    return null;
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "< 1 min";
  return `${mins} min${mins === 1 ? "" : "s"}`;
}

/** Straight-line distance in meters — used to decide whether a reroute is worth it. */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}
