import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Order } from "../types/order";
import CreateOrderForm from "./CreateOrderForm";
import TrackingMap from "./TrackingMap";
import { useRiderTracking } from "../hooks/useRiderTracking";
import { useRoute } from "../hooks/useRoute";

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Waiting for a rider",
  assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  async function loadOrders() {
    setIsLoadingOrders(true);
    try {
      const res = await api.get<Order[]>("/orders/mine");
      setOrders(res.data);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function handleOrderCreated(order: Order) {
    setOrders((prev) => [order, ...prev]);
    setSelectedOrderId(order._id);
  }

  const selectedOrder = orders.find((o) => o._id === selectedOrderId) || null;

  return (
    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
      <div>
        <CreateOrderForm onCreated={handleOrderCreated} />

        <h3 style={{ marginTop: "1.5rem" }}>My Orders</h3>
        {isLoadingOrders && <p>Loading…</p>}
        {!isLoadingOrders && orders.length === 0 && <p>No orders yet.</p>}

        <ul style={{ listStyle: "none", padding: 0 }}>
          {orders.map((order) => (
            <li key={order._id} style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => setSelectedOrderId(order._id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem",
                  background:
                    order._id === selectedOrderId ? "#e0e0ff" : "#f5f5f5",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              >
                <div>Order #{order._id.slice(-6)}</div>
                <div style={{ fontSize: "0.85em", color: "#555" }}>
                  {STATUS_LABELS[order.status]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedOrder && <OrderTrackingPanel order={selectedOrder} />}
    </div>
  );
}

function OrderTrackingPanel({ order }: { order: Order }) {
  const { location, isConnected } = useRiderTracking(order._id);

  const riderPosition = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;
  const destination = {
    lat: order.dropoff.latitude,
    lng: order.dropoff.longitude,
  };

  const { route } = useRoute(riderPosition, destination);

  return (
    <div style={{ flex: 1, minWidth: "320px" }}>
      <h3>Tracking Order #{order._id.slice(-6)}</h3>
      <p>
        Status: <strong>{STATUS_LABELS[order.status]}</strong> &nbsp;|&nbsp;
        Socket:{" "}
        <span style={{ color: isConnected ? "green" : "red" }}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </p>

      {order.status === "pending" && (
        <p>Waiting for a rider to accept this order…</p>
      )}

      <TrackingMap
        riderPosition={riderPosition}
        destination={destination}
        routeCoordinates={route?.coordinates}
      />

      {route && (
        <p>
          Distance: <strong>{route.distanceText}</strong> &nbsp;|&nbsp; ETA:{" "}
          <strong>{route.durationText}</strong>
        </p>
      )}
    </div>
  );
}
