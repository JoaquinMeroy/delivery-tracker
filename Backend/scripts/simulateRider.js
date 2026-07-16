import { io } from "socket.io-client";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

// Pass real IDs as command-line arguments:
//   node scripts/simulateRider.js <riderId> <orderId>
// Falls back to old test values if you run it with no arguments.
const RIDER_ID = process.argv[2] || "000000000000000000000000";
const ORDER_ID = process.argv[3] || "test-order-1";

// NOTE: this still simulates a fixed Manila route regardless of the real
// order's actual pickup/dropoff — matching those exactly would mean this
// script fetching the order from your API first. Good enough for testing
// the live-tracking pipeline end-to-end; real GPS (later) won't have this
// limitation since it reflects wherever the rider's phone actually is.
const START = { lat: 14.5995, lng: 120.9842 };
const END = { lat: 14.612, lng: 120.9945 };

const UPDATE_INTERVAL_MS = 1500;
const TARGET_STEPS = 40;

async function fetchRoadRoute(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("OSRM did not return a route");
  }

  return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }));
}

async function main() {
  console.log(`Simulating rider: ${RIDER_ID}`);
  console.log(`Simulating order: ${ORDER_ID}`);
  console.log("Fetching real road route from OSRM...");

  const fullRoute = await fetchRoadRoute(START, END);
  const stride = Math.max(1, Math.floor(fullRoute.length / TARGET_STEPS));
  const routePoints = fullRoute.filter((_, i) => i % stride === 0);

  console.log(
    `Simulating movement across ${routePoints.length} points, every ${UPDATE_INTERVAL_MS}ms.`,
  );

  const socket = io(SERVER_URL);
  let index = 0;

  socket.on("connect", () => {
    console.log(`Simulated rider connected: ${socket.id}`);
    socket.emit("rider-join", { riderId: RIDER_ID, orderId: ORDER_ID });

    setInterval(() => {
      const point = routePoints[index];
      console.log(
        `Sending position ${index + 1}/${routePoints.length}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      );

      socket.emit("location-update", {
        riderId: RIDER_ID,
        orderId: ORDER_ID,
        latitude: point.lat,
        longitude: point.lng,
      });

      index = (index + 1) % routePoints.length;
    }, UPDATE_INTERVAL_MS);
  });

  socket.on("connect_error", (err) => {
    console.error("Connection failed:", err.message);
  });
}

main().catch((err) => {
  console.error("Simulator failed to start:", err.message);
});
