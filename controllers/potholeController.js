import DetectedPotholeImage from "../models/DetectedPotholeImage.js";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import Pothole from "../models/Pothole.js";
import { s3Upload } from "../S3/storage.js";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

// Validate AWS Credentials on startup
function validateAWSCredentials() {
  const required = ['AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    console.error('Missing AWS configuration:', missing.join(', '));
    throw new Error(`Missing AWS configuration: ${missing.join(', ')}`);
  }
}

export const createPothole = async (req, res) => {
  try {
    // Validate AWS credentials before processing
    validateAWSCredentials();

    if (!req.files?.length) {
      return res.status(400).json({ error: "Video file required" });
    }

    const file = req.files[0];
    const tempFilename = `temp-${Date.now()}-${file.originalname}`;
    const videoPath = path.resolve(tmpdir(), tempFilename);
    const scriptPath = path.resolve(__dirname, "../pothole_detector.py");
    const outputDir = path.resolve(tmpdir(), `pothole-output-${Date.now()}`);

    console.log(`Starting detection process for: ${file.originalname}`);

    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(videoPath, file.buffer);

      const { stdout, stderr } = await execFileAsync(
        "python",
        [scriptPath, videoPath, outputDir],
        { timeout: 300000 }
      );

      console.log("Python stdout:", stdout);
      if (stderr) console.error("Python stderr:", stderr);

      const output = stdout.trim();

      if (!output.includes("DETECTED_POTHOLES:")) {
        return res.status(400).json({
          message: "No potholes detected in video",
          debug: { pythonOutput: stdout, pythonError: stderr }
        });
      }

      const logPath = output.split("DETECTED_POTHOLES:")[1].trim();
      const logData = JSON.parse(await fs.readFile(logPath, "utf-8"));

      if (!logData?.length) {
        return res.status(400).json({
          message: "Detection completed but no valid potholes found",
          debug: { logContent: logData }
        });
      }

      console.log(`Detected ${logData.length} pothole instances`);

      // Upload video to S3
      const uploadedVideos = await s3Upload([{
        buffer: file.buffer,
        originalname: `pothole-video-${Date.now()}.mp4`,
        mimetype: file.mimetype
      }]);

      const { lat, lng, severity, width, depth, description } = req.body;

      const pothole = await Pothole.create({
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(lng || logData[0].Longitude || 0),
            parseFloat(lat || logData[0].Latitude || 0)
          ]
        },
        severity: severity || 'medium',
        description: description || `Detected ${logData.length} potholes`,
        videoUrls: uploadedVideos.map(f => f.location),
        videoKeys: uploadedVideos.map(f => f.key),
        detectionStats: {
          detected: logData.length,
          imagesSaved: 0,
          imagesFailed: 0,
          errors: []
        },
        ...(width && depth && {
          size: {
            width: parseFloat(width),
            depth: parseFloat(depth),
          },
        }),
      });

      // Process detected images
      const imageRecords = [];
      for (const [index, item] of logData.entries()) {
        try {
          const imagePath = item.Image;
          await fs.access(imagePath);
          const imageBuffer = await fs.readFile(imagePath);
          
          const [upload] = await s3Upload([{
            buffer: imageBuffer,
            originalname: path.basename(imagePath),
            mimetype: 'image/jpeg'
          }]);

          const imageRecord = await DetectedPotholeImage.create({
            potholeId: pothole._id,
            imageUrl: upload.location,
            imageKey: upload.key,
            ...item
          });

          imageRecords.push(imageRecord);
          pothole.detectionStats.imagesSaved++;
        } catch (error) {
          pothole.detectionStats.imagesFailed++;
          pothole.detectionStats.errors.push(`Image ${index + 1} error: ${error.message}`);
          
          await DetectedPotholeImage.create({
            potholeId: pothole._id,
            error: error.message,
            ...item
          });
        }
      }

      await pothole.save();

      return res.status(201).json({
        success: true,
        pothole: {
          ...pothole.toObject(),
          latitude: pothole.location.coordinates[1],
          longitude: pothole.location.coordinates[0],
        },
        images: imageRecords,
        stats: pothole.detectionStats
      });

    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
      await fs.unlink(videoPath).catch(() => {});
    }
  } catch (error) {
    console.error("Pothole detection failed:", error);
    
    const response = {
      error: "Pothole detection failed",
      details: error.message
    };

    if (error.message.includes('AWS') || error.message.includes('credential')) {
      response.solution = "Check AWS credentials configuration";
    }

    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    res.status(500).json(response);
  }
};

export const getAllPotholes = async (req, res) => {
  try {
    const { status, severity, location } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (severity) query.severity = severity;
    
    if (location) {
      const [lng, lat, radius] = location.split(',').map(parseFloat);
      query.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius || 5000
        }
      };
    }

    const potholes = await Pothole.find(query)
      .populate('reportedBy', 'name email')
      .populate('verifiedBy', 'name')
      .populate('fixedBy', 'name');

    res.json(potholes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePotholeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId, note } = req.body;
    
    const update = { status };
    
    if (status === 'verified') update.verifiedBy = userId;
    if (status === 'fixed') update.fixedBy = userId;
    
    if (note) {
      update.$push = { 
        notes: {
          text: note,
          addedBy: userId
        }
      };
    }

    const pothole = await Pothole.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    res.json(pothole);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePothole = async (req, res) => {
  try {
    const pothole = await Pothole.findById(req.params.id);
    
    if (!pothole) {
      return res.status(404).json({ error: "Pothole not found" });
    }

    await (pothole.videoKeys);
    await pothole.remove();
    
    res.json({ message: "Pothole deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};