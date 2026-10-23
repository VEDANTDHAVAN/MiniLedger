import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "receipts");

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadDirectory);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();

      callback(
        null,
        `${randomUUID()}${extension}`
      );
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !allowedExtensions.has(extension)
    ) {
      callback(
        new Error("Only JPEG, PNG, and WebP receipt images are allowed.")
      );
      return;
    }

    callback(null, true);
  },
});