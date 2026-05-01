import mongoose from 'mongoose';

const userJobStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applied: { type: Boolean, default: false },
  appliedAt: { type: Date, default: null },
}, { timestamps: true });

// Compound index for fast per-user lookups
userJobStatusSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const UserJobStatus = mongoose.model('UserJobStatus', userJobStatusSchema);
export default UserJobStatus;
