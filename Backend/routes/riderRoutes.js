import express from "express";
import Rider from "../models/Rider.js";

const router = express.Router();

// Create a rider (for now — auth/JWT comes in Phase 7)
router.post("/", async (req, res) => {
  try {
    const rider = await Rider.create(req.body);
    res.status(201).json(rider);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a rider's current location
router.get("/:id", async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) return res.status(404).json({ error: "Rider not found" });
    res.json(rider);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  const riders = await Rider.find();
  res.json(riders);
});

export default router;
