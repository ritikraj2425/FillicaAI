import express from 'express';
import { getJobs, getJobById, seedJobs, createCustomJob, toggleAppliedStatus, setAppliedStatus } from '../controllers/jobs.js';

const router = express.Router();

// Public routes — no auth required
router.get('/', getJobs);
router.post('/custom', createCustomJob);
router.patch('/:id/toggle-applied', toggleAppliedStatus);
router.patch('/:id/applied', setAppliedStatus);
router.get('/:id', getJobById);
router.post('/seed', seedJobs);

export default router;
