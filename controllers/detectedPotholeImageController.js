import DetectedPotholeImage from '../models/DetectedPotholeImage.js';
import Pothole from '../models/Pothole.js';

export const getAllImages = async (req, res) => {
  try {
    const images = await DetectedPotholeImage.find({})
      .sort({ createdAt: -1 })
      .populate('potholeId');

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error('Error fetching pothole images:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching pothole images'
    });
  }
};

export const getImageById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid image ID format' });
    }

    const image = await DetectedPotholeImage.findById(id)
      .populate('potholeId', 'severity status description location');

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Pothole image not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...image.toObject(),
        pothole: image.potholeId // Flatten the populated pothole data
      }
    });
  } catch (error) {
    console.error('Error fetching pothole image:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching pothole image'
    });
  }
};

export const getImagesByPotholeId = async (req, res) => {
  try {
    const { potholeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(potholeId)) {
      return res.status(400).json({ error: 'Invalid pothole ID format' });
    }

    // Verify pothole exists
    const potholeExists = await Pothole.exists({ _id: potholeId });
    if (!potholeExists) {
      return res.status(404).json({ error: 'Pothole not found' });
    }

    const images = await DetectedPotholeImage.find({ potholeId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: images.length,
      potholeId,
      data: images
    });
  } catch (error) {
    console.error('Error fetching pothole images:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching pothole images'
    });
  }
};