export interface RiderLocation {
  riderId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface Rider {
  _id: string;
  name: string;
  phone?: string;
  isOnline: boolean;
  currentLocation: {
    latitude: number | null;
    longitude: number | null;
    updatedAt: string | null;
  };
}

export interface LatLng {
  lat: number;
  lng: number;
}
