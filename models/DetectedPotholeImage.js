import mongoose from 'mongoose';

const DetectedPotholeImageSchema = new mongoose.Schema({
  potholeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pothole', required: true },
  imageUrl: String,
  imageKey: String,
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  frame: Number,
  timestamp: String,
  latitude: Number,
  longitude: Number
}, { timestamps: true });

export default mongoose.model('DetectedPotholeImage', DetectedPotholeImageSchema);
