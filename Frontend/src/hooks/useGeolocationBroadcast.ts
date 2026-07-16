import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";

interface UseGeolocationBroadcastResult {
  isBroadcasting: boolean;
  error: string | null;
  lastPosition: { lat: number; lng: number } | null;
  start: () => void;
  stop: () => void;
}

/**
 * Watches the device's real GPS position and emits it over the socket,
 * using the exact same "location-update" event the Node simulator sends —
 * so the backend and every downstream customer view don't need to know
 * or care whether the source is a real phone or a test script.
 */
export function useGeolocationBroadcast(
  riderId: string | null,
  orderId: string | null,
): UseGeolocationBroadcastResult {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  function start() {
    if (!riderId || !orderId) {
      setError("No active order to share your location for.");
      return;
    }
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported in this browser.");
      return;
    }

    setError(null);
    socket.connect();
    socket.emit("rider-join", { riderId, orderId });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLastPosition({ lat: latitude, lng: longitude });
        socket.emit("location-update", {
          riderId,
          orderId,
          latitude,
          longitude,
        });
      },
      (err) => {
        setError(err.message);
        setIsBroadcasting(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    setIsBroadcasting(true);
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isBroadcasting, error, lastPosition, start, stop };
}
