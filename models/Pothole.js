import mongoose from 'mongoose';

const PotholeSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  size: {
    width: { type: Number, min: 0 },
    depth: { type: Number, min: 0 }
  },
  description: String,
  status: {
    type: String,
    enum: ['reported', 'verified', 'in_progress', 'fixed'],
    default: 'reported'
  },
  videoUrls: [String],
  videoKeys: [String],
  detectionStats: {
    detected: { type: Number, default: 0 },
    imagesSaved: { type: Number, default: 0 },
    imagesFailed: { type: Number, default: 0 },
    errors: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

PotholeSchema.index({ location: '2dsphere' });

PotholeSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

PotholeSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

export default mongoose.model('Pothole', PotholeSchema);