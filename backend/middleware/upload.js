import multer from 'multer';
import os from 'os';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Must use /tmp for Vercel Serverless Functions
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

export const upload = multer({ storage });