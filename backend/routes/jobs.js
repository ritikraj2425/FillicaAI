import express from 'express';
import { getJobs, getJobById, seedJobs, createCustomJob, toggleAppliedStatus, setAppliedStatus } from '../controllers/jobs.js';
import { isAuthenticated, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes with optional auth (to merge per-user applied status)
router.get('/', optionalAuth, getJobs);
router.get('/:id', getJobById);
router.post('/seed', seedJobs);

// Authenticated routes — require login to track who applied/created
router.post('/custom', isAuthenticated, createCustomJob);
router.patch('/:id/toggle-applied', isAuthenticated, toggleAppliedStatus);
router.patch('/:id/applied', isAuthenticated, setAppliedStatus);

export default router;
