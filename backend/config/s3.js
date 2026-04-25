import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import crypto from "crypto";

let s3Instance = null;
const getS3 = () => {
  if (!s3Instance) {
    s3Instance = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Instance;
};

const generateFileName = (originalName, folder) => {
  const ext = path.extname(originalName);
  const random = crypto.randomBytes(8).toString("hex");
  return `${folder}/${Date.now()}-${random}${ext}`;
};

export const uploadFile = async (file) => {
  let folder = "others";
  if (file.mimetype.startsWith("image/")) folder = "images";
  else if (file.mimetype.startsWith("video/")) folder = "videos";
  else if (file.mimetype === "application/pdf") folder = "pdfs";

  const fileName = generateFileName(file.originalname, folder);
  const fileStream = fs.createReadStream(file.path);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileStream,
    ContentType: file.mimetype,
  });

  await getS3().send(command);

  const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  return { url, key: fileName };
};

export const getSignedFileUrl = async (url) => {
  try {
    if (!url || !url.includes('.amazonaws.com/')) return url;
    
    // Extract key from url. Format: https://BUCKET.s3.REGION.amazonaws.com/KEY
    const key = url.split('.amazonaws.com/')[1];
    if (!key) return url;
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    
    return await getSignedUrl(getS3(), command, { expiresIn: 3600 });
  } catch (err) {
    console.error("Failed to generate signed URL:", err);
    return url;
  }
};