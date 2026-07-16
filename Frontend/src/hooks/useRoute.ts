import { useEffect, useRef, useState } from "react";
import {
  fetchRoute,
  haversineDistance,
  type RouteResult,
} from "../lib/routing";
import type { LatLng } from "../types/tracking";

// Only refetch the route if the rider has moved at least this far
// since the last calculation. Prevents hammering OSRM every 2 seconds
// when the rider has barely moved.
const REROUTE_THRESHOLD_METERS = 50;

export function useRoute(
  riderPosition: LatLng | null,
  destination: LatLng | null,
) {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedPosition = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!riderPosition || !destination) return;

    const last = lastFetchedPosition.current;
    const movedFar =
      !last ||
      haversineDistance(last, riderPosition) >= REROUTE_THRESHOLD_METERS;

    if (!movedFar) return;

    let cancelled = false;
    setIsLoading(true);

    fetchRoute(riderPosition, destination).then((result) => {
      if (cancelled) return;
      if (result) {
        setRoute(result);
        lastFetchedPosition.current = riderPosition;
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [riderPosition, destination]);

  return { route, isLoading };
}
