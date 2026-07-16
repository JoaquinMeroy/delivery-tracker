import express from "express";
import Order from "../models/Order.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// POST /api/orders — a customer creates a new delivery request
router.post("/", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;

    if (
      !pickup?.latitude ||
      !pickup?.longitude ||
      !dropoff?.latitude ||
      !dropoff?.longitude
    ) {
      return res
        .status(400)
        .json({ error: "Pickup and dropoff coordinates are required" });
    }

    const order = await Order.create({
      customer: req.user._id,
      pickup,
      dropoff,
      status: "pending",
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/orders/mine — orders belonging to the logged-in user
// (their own orders if customer, their assigned deliveries if rider)
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const filter =
      req.user.role === "rider"
        ? { rider: req.user._id }
        : { customer: req.user._id };

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/orders/available — unassigned orders a rider could pick up
router.get(
  "/available",
  requireAuth,
  requireRole("rider"),
  async (req, res) => {
    try {
      const orders = await Order.find({ status: "pending", rider: null }).sort({
        createdAt: -1,
      });
      res.json(orders);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// GET /api/orders/:id — fetch one order (used by the tracking page)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "rider",
      "name email",
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only the customer who placed it or the rider assigned to it can view it.
    const isOwner = order.customer.toString() === req.user._id.toString();
    const isAssignedRider =
      order.rider && order.rider._id.toString() === req.user._id.toString();

    if (!isOwner && !isAssignedRider && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/orders/:id/accept — a rider claims a pending order
router.post(
  "/:id/accept",
  requireAuth,
  requireRole("rider"),
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (order.status !== "pending" || order.rider) {
        return res
          .status(409)
          .json({ error: "This order has already been taken" });
      }

      order.rider = req.user._id;
      order.status = "assigned";
      await order.save();

      res.json(order);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// PATCH /api/orders/:id/status — the assigned rider moves the order forward
const ALLOWED_TRANSITIONS = {
  assigned: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
};

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("rider"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) return res.status(404).json({ error: "Order not found" });
      if (!order.rider || order.rider.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ error: "You are not assigned to this order" });
      }

      const allowedNext = ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowedNext.includes(status)) {
        return res
          .status(400)
          .json({ error: `Cannot move from "${order.status}" to "${status}"` });
      }

      order.status = status;
      await order.save();

      res.json(order);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

export default router;
