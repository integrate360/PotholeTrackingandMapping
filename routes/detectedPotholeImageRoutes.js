import express from "express";
import {
  getAllImages,
  getImageById,
  getImagesByPotholeId,
} from "../controllers/detectedPotholeImageController.js";

const router = express.Router();

router.get("/getAllImages", getAllImages);
router.get("/:id", getImageById);
router.get("/pothole/:potholeId", getImagesByPotholeId);

export default router;
