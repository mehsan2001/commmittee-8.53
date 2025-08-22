import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { nanoid } from "nanoid";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local storage
const storageMulter = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storageMulter });

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Local file upload endpoint
  router.post("/upload-receipt", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // File has been saved by multer
      const filename = req.file.filename;
      const url = `/uploads/${filename}`;

      res.json({
        success: true,
        url: url,
        filename: filename
      });

    } catch (error) {
      console.error("Upload error details:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to upload file", details: errorMessage });
    }
  });

  // Document upload endpoint
  router.post("/upload-document", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const { documentType, userId } = req.body;
      
      // Create organized filename
      const fileExtension = path.extname(req.file.originalname);
      const timestamp = Date.now();
      const sanitizedDocType = documentType.replace(/[^a-zA-Z0-9]/g, '_');
      const newFilename = `user_${userId}_${sanitizedDocType}_${timestamp}${fileExtension}`;
      
      // Rename the file
      const oldPath = req.file.path;
      const newPath = path.join(uploadsDir, newFilename);
      fs.renameSync(oldPath, newPath);

      const url = `/uploads/${newFilename}`;

      res.json({
        success: true,
        url: url,
        filename: newFilename,
        documentType: documentType
      });

    } catch (error) {
      console.error("Document upload error details:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to upload document", details: errorMessage });
    }
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

  // Health check endpoint
  router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
