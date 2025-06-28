import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import potholeRoutes from './routes/potholeRoutes.js';
import detectedPotholeImageRoutes from './routes/detectedPotholeImageRoutes.js';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/potholes', potholeRoutes);
app.use('/api/images', detectedPotholeImageRoutes);

export default app;
