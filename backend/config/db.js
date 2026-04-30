import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      throw new Error('MONGO_URL not found in environment variables');
    }
    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    // In serverless (Vercel), process.exit(1) causes FUNCTION_INVOCATION_FAILED.
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
};

export default connectDB;
