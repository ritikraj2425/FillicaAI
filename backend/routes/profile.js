import express from 'express';
import { createProfile, getProfile, updateProfile, updateProfileWithResume } from '../controllers/profile.js';
import { isAuthenticated } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All profile routes require authentication
router.use(isAuthenticated);

// Create profile from resume upload
router.post('/create', upload.single('resume'), createProfile);

// Get current user's profile
router.get('/', getProfile);

// Update profile fields (JSON body)
router.put('/', updateProfile);

// Update profile by re-uploading a resume
router.put('/resume', upload.single('resume'), updateProfileWithResume);

export default router;
