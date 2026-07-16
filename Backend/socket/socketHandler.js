import User from "../models/User.js";

// Simple in-memory throttle so we don't hammer the DB / network
// on every single GPS callback (they can fire multiple times a second).
const lastUpdateAt = new Map(); // riderId -> timestamp
const MIN_UPDATE_INTERVAL_MS = 2000;

export default function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-order-room", (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("leave-order-room", (orderId) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on("rider-join", ({ riderId, orderId }) => {
      socket.data.riderId = riderId;
      socket.data.orderId = orderId;
      socket.join(`rider:${riderId}`);
      if (orderId) socket.join(`order:${orderId}`);
    });

    socket.on(
      "location-update",
      async ({ riderId, orderId, latitude, longitude }) => {
        if (!riderId || latitude == null || longitude == null) return;

        const now = Date.now();
        const last = lastUpdateAt.get(riderId) || 0;
        if (now - last < MIN_UPDATE_INTERVAL_MS) return; // throttle
        lastUpdateAt.set(riderId, now);

        try {
          await User.findByIdAndUpdate(riderId, {
            currentLocation: { latitude, longitude, updatedAt: new Date() },
            isOnline: true,
          });
        } catch (err) {
          console.error("Failed to persist rider location:", err.message);
        }

        const payload = { riderId, latitude, longitude, updatedAt: new Date() };

        if (orderId) {
          io.to(`order:${orderId}`).emit("rider-location", payload);
        } else {
          io.to(`rider:${riderId}`).emit("rider-location", payload);
        }
      },
    );

    socket.on("disconnect", async () => {
      const riderId = socket.data.riderId;
      if (riderId) {
        try {
          await User.findByIdAndUpdate(riderId, { isOnline: false });
        } catch (err) {
          console.error("Failed to mark rider offline:", err.message);
        }
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
}
