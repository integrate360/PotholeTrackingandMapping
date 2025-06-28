


import express from 'express';
import {
  createPothole,
  getAllPotholes,
  updatePotholeStatus,
  deletePothole
} from '../controllers/potholeController.js';

// import upload from "../S3/multer.js"; 
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST: Create a pothole report (video upload)
router.post(
  '/potholes',
  upload.array('video', 1),
  createPothole
);

// GET: Get all potholes (with optional filters)
router.get('/potholes', getAllPotholes);

// PATCH: Update pothole status (verify/fix)
router.patch('/potholes/:id/status', updatePotholeStatus);

// DELETE: Delete a pothole report
router.delete('/potholes/:id', deletePothole);

export default router;
