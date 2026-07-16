export type OrderStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface OrderPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RiderSummary {
  _id: string;
  name: string;
  email: string;
}

export interface Order {
  _id: string;
  customer: string;
  rider: RiderSummary | string | null;
  pickup: OrderPoint;
  dropoff: OrderPoint;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
