// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import dotenv from "dotenv";
// import { createReadStream } from "fs";
// dotenv.config();

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_KEY,
//   },
// });

// export const s3Upload = async (files) => {
//   try {
//     if (!files || files.length === 0) {
//       console.warn("No files provided");
//       return [];
//     }

//     const uploadPromises = files.map(async (file) => {
//       const uniqueKey = `${Date.now()}-${file.originalname}`;

//       const uploadParams = {
//         Bucket: process.env.AWS_BUCKET_NAME,
//         Key: uniqueKey,
//         Body: createReadStream(file.path), // Read stream for disk uploads
//         ContentType: file.mimetype,
//         ContentLength: file.size,
//       };

//       try {
//         await s3.send(new PutObjectCommand(uploadParams));

//         const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

//         return {
//           location: fileUrl,
//           key: uniqueKey,
//           mimetype: file.mimetype,
//           size: file.size,
//         };
//       } catch (uploadError) {
//         console.error(`Error uploading ${file.originalname}:`, uploadError);
//         throw uploadError;
//       }
//     });

//     return await Promise.all(uploadPromises);
//   } catch (error) {
//     console.error("Error during S3 upload:", error);
//     throw error;
//   }
// };



import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export const s3Upload = async (files = []) => {
  try {
    const uploadPromises = files.map(async (file) => {
      if (!file.buffer && !file.path) {
        throw new Error('File must have either buffer or path property');
      }

      const key = `uploads/${uuidv4()}-${file.originalname || 'file'}`;
      let body;

      if (file.buffer) {
        // Handle in-memory buffer
        body = file.buffer;
      } else if (file.path) {
        // Handle file path
        body = await fs.readFile(file.path);
      } else {
        throw new Error('No valid file content provided');
      }

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: file.mimetype || 'application/octet-stream',
      };

      await s3Client.send(new PutObjectCommand(params));

      return {
        key,
        location: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      };
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw error;
  }
};