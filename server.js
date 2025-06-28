import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
const PORT = process.env.PORT || 8000;
dotenv.config();

// Connect to MongoDB
connectDB();
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
