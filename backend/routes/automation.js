/**
 * Automation REST Routes (Cloud Backend)
 * 
 * These endpoints serve automation history data only.
 * Actual browser automation runs locally inside the Electron desktop app
 * via electron/playwright/agent.js — NOT on this cloud server.
 */

import AutomationRun from '../models/automationRun.js';

/**
 * REST endpoint: get automation history for a user
 */
export async function getAutomationHistory(req, res) {
  try {
    const runs = await AutomationRun.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('jobId', 'title company')
      .lean();

    return res.json({ runs });
  } catch (err) {
    console.error('Get automation history error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getAutomationRun(req, res) {
  try {
    const run = await AutomationRun.findById(req.params.id)
      .populate('jobId', 'title company applicationUrl')
      .lean();

    if (!run) {
      return res.status(404).json({ error: 'Automation run not found' });
    }

    return res.json({ run });
  } catch (err) {
    console.error('Get automation run error:', err);
    return res.status(500).json({ error: err.message });
  }
}
