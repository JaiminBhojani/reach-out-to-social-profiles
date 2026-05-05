import mongoose from 'mongoose';
import { env } from '../lib/env';

/**
 * Connects to MongoDB Atlas using the URI from environment variables.
 */
export const connectDB = async (): Promise<void> => {
  const uri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social-profiles';
  
  if (mongoose.connection.readyState >= 1) {
    // Already connected or connecting
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[MongoDB] Successfully connected to database.`);
  } catch (error) {
    console.error(`[MongoDB] Failed to connect:`, error);
    // Don't exit process in serverless environments, but we should log it
    throw error;
  }
};
