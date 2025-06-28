import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import potholeRoutes from './routes/potholeRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/potholes', potholeRoutes);

export default app;
