import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import { changeVideoResolution } from "./videoProcessor";

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "videos");
app.use("/videos", express.static(OUTPUT_DIR));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /mp4|avi|mkv|mov/;
    const extName = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    } else {
      cb(new Error("Only video files are allowed!"));
    }
  },
});

app.post(
  "/upload",
  upload.single("video"),
  async (req: Request, res: Response): Promise<any> => {
    const { width, height } = req.query;

    if (!(req as any).file) {
      return res.status(400).send("Tệp không hợp lệ.");
    }
    const inputPath = path.join(UPLOAD_DIR, req.file.filename);
    const outputFileName = `${width}x${height}_${req.file.filename}`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    try {
      await changeVideoResolution(inputPath, outputPath, +width, +height);
      // const videoUrl = `${HOST}:${PORT}/videos/${outputFileName}`;
      // res.status(200).json({ message: "Video resized successfully", videoUrl });
      res.download(outputPath, outputFileName, async (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res.status(500).json({ error: "Failed to send file" });
        }
        try {
          await fs.promises.unlink(inputPath);
          await fs.promises.unlink(outputPath);
        } catch (err) {
          res.status(500).json({ error: "Failed to process video" });
        }
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to process video" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server đang chạy trên ${HOST}:${PORT}`);
});
