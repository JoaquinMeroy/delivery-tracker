import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Server } from "socket.io";

// import riderRoutes from "./routes/riderRoutes.js";
import registerSocketHandlers from "./socket/socketHandler.js";

import authRoutes from "./routes/authRoutes.js";

import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS: restrict this to your actual frontend URL in production
const ALLOWED_ORIGIN = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

app.use("/api/orders", orderRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
// app.use("/api/riders", riderRoutes);

app.use("/api/auth", authRoutes);

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ["GET", "POST"] },
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
