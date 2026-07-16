import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import type { RiderLocation } from "../types/tracking";

export function useRiderTracking(orderId: string | null) {
  const [location, setLocation] = useState<RiderLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    socket.connect();

    function handleConnect() {
      setIsConnected(true);
      socket.emit("join-order-room", orderId);
    }

    function handleLocation(data: RiderLocation) {
      setLocation(data);
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("rider-location", handleLocation);
    socket.on("disconnect", handleDisconnect);

    // If already connected (e.g. hot reload), join immediately
    if (socket.connected) handleConnect();

    return () => {
      socket.emit("leave-order-room", orderId);
      socket.off("connect", handleConnect);
      socket.off("rider-location", handleLocation);
      socket.off("disconnect", handleDisconnect);
    };
  }, [orderId]);

  return { location, isConnected };
}
