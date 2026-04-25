import mongoose from 'mongoose';

const actionSchema = new mongoose.Schema({
  selector: String,
  action: { type: String, enum: ['type', 'click', 'select'] },
  value: String,
  confidence: { type: Number, min: 0, max: 1 },
  reason: String,
  fieldLabel: String,
  executed: { type: Boolean, default: false },
  userEdited: { type: Boolean, default: false },
});

const stepSchema = new mongoose.Schema({
  stepNumber: Number,
  url: String,
  plan: String,
  actions: [actionSchema],
  requiresIntervention: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const automationRunSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'review', 'completed', 'failed', 'cancelled'],
      default: 'running',
    },
    steps: [stepSchema],
    totalActions: { type: Number, default: 0 },
    lowConfidenceCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    error: String,
  },
  { timestamps: true }
);

const AutomationRun = mongoose.model('AutomationRun', automationRunSchema);
export default AutomationRun;
