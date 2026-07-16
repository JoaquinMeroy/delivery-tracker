import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Order, OrderStatus } from "../types/order";
import { useGeolocationBroadcast } from "../hooks/useGeolocationBroadcast";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  assigned: "Mark as Picked Up",
  picked_up: "Mark as In Transit",
  in_transit: "Mark as Delivered",
};

const ACTIVE_STATUSES: OrderStatus[] = ["assigned", "picked_up", "in_transit"];

export default function RiderDashboard() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setIsLoading(true);
    try {
      const [availableRes, mineRes] = await Promise.all([
        api.get<Order[]>("/orders/available"),
        api.get<Order[]>("/orders/mine"),
      ]);
      setAvailableOrders(availableRes.data);
      setMyOrders(mineRes.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function acceptOrder(orderId: string) {
    setError(null);
    try {
      await api.post(`/orders/${orderId}/accept`);
      loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to accept order.");
    }
  }

  async function advanceStatus(order: Order) {
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    setError(null);
    try {
      await api.patch(`/orders/${order._id}/status`, { status: nextStatus });
      loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update status.");
    }
  }

  const activeOrder = myOrders.find((o) => ACTIVE_STATUSES.includes(o.status));

  const geo = useGeolocationBroadcast(
    user?._id ?? null,
    activeOrder?._id ?? null,
  );

  // If the active order disappears (delivered/cancelled), stop sharing location.
  useEffect(() => {
    if (!activeOrder && geo.isBroadcasting) {
      geo.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder]);

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {activeOrder && (
        <div
          style={{
            padding: "1rem",
            background: "#eef7ee",
            marginBottom: "1.5rem",
          }}
        >
          <h3>Active Delivery — Order #{activeOrder._id.slice(-6)}</h3>
          <p>Status: {activeOrder.status}</p>

          {NEXT_STATUS[activeOrder.status] && (
            <button onClick={() => advanceStatus(activeOrder)}>
              {NEXT_STATUS_LABEL[activeOrder.status]}
            </button>
          )}

          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#fff",
              border: "1px solid #999",
            }}
          >
            {geo.isBroadcasting ? (
              <>
                <p style={{ margin: 0, color: "green" }}>
                  🟢 Sharing your live location with the customer
                </p>
                {geo.lastPosition && (
                  <p style={{ margin: "0.25rem 0", fontSize: "0.85em" }}>
                    Last sent: {geo.lastPosition.lat.toFixed(5)},{" "}
                    {geo.lastPosition.lng.toFixed(5)}
                  </p>
                )}
                <button onClick={geo.stop}>Stop Sharing Location</button>
              </>
            ) : (
              <>
                <p style={{ margin: 0 }}>
                  Your location isn't being shared yet.
                </p>
                <button onClick={geo.start}>
                  📍 Go Live (Share My Location)
                </button>
              </>
            )}
            {geo.error && (
              <p style={{ color: "red", fontSize: "0.85em" }}>{geo.error}</p>
            )}
          </div>
        </div>
      )}

      <h3>Available Orders</h3>
      {isLoading && <p>Loading…</p>}
      {!isLoading && availableOrders.length === 0 && (
        <p>No pending orders right now.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {availableOrders.map((order) => (
          <li
            key={order._id}
            style={{
              padding: "0.75rem",
              border: "1px solid #ccc",
              marginBottom: "0.5rem",
            }}
          >
            <div>Order #{order._id.slice(-6)}</div>
            <div style={{ fontSize: "0.85em", color: "#555" }}>
              Pickup: {order.pickup.latitude.toFixed(4)},{" "}
              {order.pickup.longitude.toFixed(4)} → Dropoff:{" "}
              {order.dropoff.latitude.toFixed(4)},{" "}
              {order.dropoff.longitude.toFixed(4)}
            </div>
            <button
              onClick={() => acceptOrder(order._id)}
              disabled={!!activeOrder}
            >
              Accept
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
