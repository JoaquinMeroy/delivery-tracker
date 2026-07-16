import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { Order } from "../types/order";

interface CreateOrderFormProps {
  onCreated: (order: Order) => void;
}

export default function CreateOrderForm({ onCreated }: CreateOrderFormProps) {
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupLat(pos.coords.latitude.toString());
        setPickupLng(pos.coords.longitude.toString());
      },
      (err) => setError(`Couldn't get your location: ${err.message}`),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const pickup = {
      latitude: parseFloat(pickupLat),
      longitude: parseFloat(pickupLng),
    };
    const dropoff = {
      latitude: parseFloat(dropoffLat),
      longitude: parseFloat(dropoffLng),
    };

    if (
      [
        pickup.latitude,
        pickup.longitude,
        dropoff.latitude,
        dropoff.longitude,
      ].some(Number.isNaN)
    ) {
      setError("Please fill in all four coordinates with valid numbers.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<Order>("/orders", { pickup, dropoff });
      onCreated(res.data);
      setPickupLat("");
      setPickupLng("");
      setDropoffLat("");
      setDropoffLng("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "320px",
      }}
    >
      <h3>Request a Delivery</h3>

      <button type="button" onClick={useMyLocation}>
        📍 Use my current location for pickup
      </button>

      <label>
        Pickup latitude
        <input
          value={pickupLat}
          onChange={(e) => setPickupLat(e.target.value)}
          required
        />
      </label>
      <label>
        Pickup longitude
        <input
          value={pickupLng}
          onChange={(e) => setPickupLng(e.target.value)}
          required
        />
      </label>

      <label>
        Dropoff latitude
        <input
          value={dropoffLat}
          onChange={(e) => setDropoffLat(e.target.value)}
          required
        />
      </label>
      <label>
        Dropoff longitude
        <input
          value={dropoffLng}
          onChange={(e) => setDropoffLng(e.target.value)}
          required
        />
      </label>

      {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Request Delivery"}
      </button>
    </form>
  );
}
